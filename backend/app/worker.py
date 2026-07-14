from __future__ import annotations

import asyncio
import logging
import shutil
import socket
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Awaitable, Callable

import httpx
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import AnalyticsEvent, BackgroundJob, EventOutbox, MediaAsset, Scan, ServiceMedia

logger = logging.getLogger(__name__)
JobHandler = Callable[[AsyncSession, dict], Awaitable[None]]


async def generate_media_derivatives(session: AsyncSession, payload: dict) -> None:
    asset = await session.get(MediaAsset, int(payload["media_asset_id"]))
    if not asset:
        raise ValueError("Media asset not found")
    source = Path(settings.MEDIA_ROOT) / asset.storage_key
    if not source.is_file():
        raise FileNotFoundError(source)

    asset.processing_status = "processing"
    await session.commit()
    visibility_dir = "public" if asset.visibility == "public" else "private"
    output_dir = Path(settings.MEDIA_ROOT) / "derivatives" / visibility_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    base_name = f"asset-{asset.id}"

    if asset.media_type == "image":
        from PIL import Image

        with Image.open(source) as image:
            image = image.convert("RGB")
            asset.width, asset.height = image.size
            for suffix, longest, quality in (("sm", 900, 76), ("lg", 1600, 82)):
                derivative = image.copy()
                derivative.thumbnail((longest, longest))
                derivative.save(
                    output_dir / f"{base_name}-{suffix}.webp",
                    "WEBP",
                    quality=quality,
                    method=6,
                )
            public_name = f"{base_name}-lg.webp"
    elif asset.media_type == "video":
        output = output_dir / f"{base_name}.mp4"
        process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-an",
            "-vf",
            "scale='min(1920,iw)':-2",
            "-c:v",
            "libx264",
            "-crf",
            "24",
            "-preset",
            "medium",
            "-movflags",
            "+faststart",
            str(output),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode:
            raise RuntimeError(stderr.decode("utf-8", errors="replace")[-1000:])
        public_name = output.name
    else:
        output = output_dir / f"{base_name}{source.suffix.lower()}"
        shutil.copy2(source, output)
        public_name = output.name

    if asset.visibility == "public":
        asset.public_path = f"/media/public/{public_name}"
        media_rows = (
            await session.execute(
                select(ServiceMedia).where(ServiceMedia.media_asset_id == asset.id)
            )
        ).scalars()
        for media in media_rows:
            if media.is_public:
                media.media_url = asset.public_path
    asset.processing_status = "ready"


async def enforce_analytics_retention(session: AsyncSession, _: dict) -> None:
    cutoff = datetime.now(UTC) - timedelta(days=settings.RAW_ANALYTICS_RETENTION_DAYS)
    await refresh_analytics_aggregates(session, {})
    await session.execute(delete(AnalyticsEvent).where(AnalyticsEvent.occurred_at < cutoff))
    await session.execute(delete(Scan).where(Scan.scanned_at < cutoff))


async def _refresh_aggregate_table(
    session: AsyncSession,
    *,
    table_name: str,
    bucket_column: str,
    grain: str,
) -> None:
    await session.execute(
        text(
            f"""
            WITH attributed_sessions AS (
                SELECT
                    ss.id AS scan_session_id,
                    s.campaign_id,
                    date_trunc(:grain, ss.created_at)::date AS bucket
                FROM scan_sessions ss
                JOIN scans s ON s.id = ss.scan_id
            ),
            event_rollup AS (
                SELECT
                    scan_session_id,
                    count(*) FILTER (WHERE event_type = 'destination_view') AS destination_views,
                    count(*) FILTER (
                        WHERE event_type IN ('cta_click', 'whatsapp_click', 'instagram_click')
                    ) AS cta_clicks
                FROM analytics_events
                GROUP BY scan_session_id
            ),
            conversion_rollup AS (
                SELECT
                    scan_session_id,
                    count(*) FILTER (WHERE conversion_type = 'lead') AS leads,
                    count(*) FILTER (WHERE conversion_type = 'order') AS orders,
                    count(*) FILTER (WHERE conversion_type = 'service') AS services,
                    coalesce(sum(value_mxn), 0) AS revenue_mxn
                FROM conversions
                GROUP BY scan_session_id
            )
            INSERT INTO {table_name} (
                {bucket_column}, campaign_id, scan_count, unique_sessions,
                destination_views, cta_clicks, leads, orders, services,
                revenue_mxn, updated_at
            )
            SELECT
                attributed_sessions.bucket,
                attributed_sessions.campaign_id,
                count(*)::integer,
                count(DISTINCT attributed_sessions.scan_session_id)::integer,
                coalesce(sum(event_rollup.destination_views), 0)::integer,
                coalesce(sum(event_rollup.cta_clicks), 0)::integer,
                coalesce(sum(conversion_rollup.leads), 0)::integer,
                coalesce(sum(conversion_rollup.orders), 0)::integer,
                coalesce(sum(conversion_rollup.services), 0)::integer,
                coalesce(sum(conversion_rollup.revenue_mxn), 0),
                now()
            FROM attributed_sessions
            LEFT JOIN event_rollup USING (scan_session_id)
            LEFT JOIN conversion_rollup USING (scan_session_id)
            GROUP BY attributed_sessions.bucket, attributed_sessions.campaign_id
            ON CONFLICT ({bucket_column}, campaign_id) DO UPDATE SET
                scan_count = EXCLUDED.scan_count,
                unique_sessions = EXCLUDED.unique_sessions,
                destination_views = EXCLUDED.destination_views,
                cta_clicks = EXCLUDED.cta_clicks,
                leads = EXCLUDED.leads,
                orders = EXCLUDED.orders,
                services = EXCLUDED.services,
                revenue_mxn = EXCLUDED.revenue_mxn,
                updated_at = now()
            """
        ),
        {"grain": grain},
    )


async def refresh_analytics_aggregates(session: AsyncSession, _: dict) -> None:
    await _refresh_aggregate_table(
        session,
        table_name="analytics_daily_aggregates",
        bucket_column="bucket_date",
        grain="day",
    )
    await _refresh_aggregate_table(
        session,
        table_name="analytics_monthly_aggregates",
        bucket_column="bucket_month",
        grain="month",
    )


async def dispatch_outbox_job(session: AsyncSession, payload: dict) -> None:
    event = await session.get(EventOutbox, int(payload["event_outbox_id"]))
    if not event or event.status == "processed":
        return
    if settings.N8N_WEBHOOK_URL:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                settings.N8N_WEBHOOK_URL,
                json={"topic": event.topic, "payload": event.payload},
            )
            response.raise_for_status()
    event.status = "processed"
    event.processed_at = datetime.now(UTC)


JOB_HANDLERS: dict[str, JobHandler] = {
    "media.generate_derivatives": generate_media_derivatives,
    "analytics.retention": enforce_analytics_retention,
    "analytics.refresh_aggregates": refresh_analytics_aggregates,
    "outbox.dispatch": dispatch_outbox_job,
}


async def _enqueue_outbox(session: AsyncSession) -> None:
    pending = (
        await session.execute(
            select(EventOutbox)
            .where(EventOutbox.status == "pending")
            .order_by(EventOutbox.created_at)
            .limit(20)
        )
    ).scalars()
    for event in pending:
        event.status = "queued"
        session.add(
            BackgroundJob(
                job_type="outbox.dispatch",
                payload={"event_outbox_id": event.id},
            )
        )


async def _enqueue_maintenance(session: AsyncSession) -> None:
    now = datetime.now(UTC)
    schedules = {
        "analytics.refresh_aggregates": timedelta(hours=1),
        "analytics.retention": timedelta(days=1),
    }
    for job_type, interval in schedules.items():
        latest = await session.scalar(
            select(func.max(BackgroundJob.created_at)).where(
                BackgroundJob.job_type == job_type
            )
        )
        if latest is None or latest < now - interval:
            session.add(BackgroundJob(job_type=job_type, payload={}))


async def _claim_job(session: AsyncSession, worker_id: str) -> BackgroundJob | None:
    job = (
        await session.execute(
            select(BackgroundJob)
            .where(
                BackgroundJob.status == "pending",
                BackgroundJob.scheduled_for <= datetime.now(UTC),
            )
            .order_by(BackgroundJob.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
    ).scalar_one_or_none()
    if job:
        job.status = "processing"
        job.locked_at = datetime.now(UTC)
        job.locked_by = worker_id
        job.attempts += 1
    return job


async def run_worker() -> None:
    worker_id = f"{socket.gethostname()}-{id(asyncio.current_task())}"
    logger.info("7Fitment worker started id=%s", worker_id)
    while True:
        async with AsyncSessionLocal() as session:
            await _enqueue_outbox(session)
            await _enqueue_maintenance(session)
            job = await _claim_job(session, worker_id)
            await session.commit()
            if not job:
                await asyncio.sleep(settings.WORKER_POLL_SECONDS)
                continue
            try:
                handler = JOB_HANDLERS.get(job.job_type)
                if not handler:
                    raise ValueError(f"Unknown job type: {job.job_type}")
                await handler(session, job.payload)
                job.status = "completed"
                job.completed_at = datetime.now(UTC)
                job.last_error = None
                await session.commit()
            except Exception as exc:  # noqa: BLE001
                await session.rollback()
                failed = await session.get(BackgroundJob, job.id)
                if failed:
                    failed.status = "failed" if failed.attempts >= failed.max_attempts else "pending"
                    failed.last_error = str(exc)[:2000]
                    failed.scheduled_for = datetime.now(UTC) + timedelta(minutes=failed.attempts)
                    await session.commit()
                logger.exception("Job failed id=%s type=%s", job.id, job.job_type)


async def _shutdown() -> None:
    await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    finally:
        asyncio.run(_shutdown())
