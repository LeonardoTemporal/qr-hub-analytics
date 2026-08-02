"""Add portal PIN throttling and durable analytics aggregates.

Revision ID: 20260713_security_analytics
Revises: 20260713_evolution
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260713_security_analytics"
down_revision: str | None = "20260713_evolution"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _aggregate_columns(bucket_name: str) -> list[sa.Column]:
    return [
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(bucket_name, sa.Date(), nullable=False),
        sa.Column("campaign_id", sa.String(length=120), nullable=False),
        sa.Column("scan_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unique_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("destination_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cta_clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("leads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("services", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revenue_mxn", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ]


def upgrade() -> None:
    op.add_column(
        "vehicles",
        sa.Column("failed_pin_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "vehicles",
        sa.Column("pin_locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "analytics_daily_aggregates",
        *_aggregate_columns("bucket_date"),
        sa.UniqueConstraint(
            "bucket_date", "campaign_id", name="uq_analytics_daily_bucket"
        ),
    )
    op.create_index(
        "ix_analytics_daily_campaign_date",
        "analytics_daily_aggregates",
        ["campaign_id", "bucket_date"],
    )
    op.create_table(
        "analytics_monthly_aggregates",
        *_aggregate_columns("bucket_month"),
        sa.UniqueConstraint(
            "bucket_month", "campaign_id", name="uq_analytics_monthly_bucket"
        ),
    )
    op.create_index(
        "ix_analytics_monthly_campaign_month",
        "analytics_monthly_aggregates",
        ["campaign_id", "bucket_month"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_analytics_monthly_campaign_month",
        table_name="analytics_monthly_aggregates",
    )
    op.drop_table("analytics_monthly_aggregates")
    op.drop_index(
        "ix_analytics_daily_campaign_date",
        table_name="analytics_daily_aggregates",
    )
    op.drop_table("analytics_daily_aggregates")
    op.drop_column("vehicles", "pin_locked_until")
    op.drop_column("vehicles", "failed_pin_attempts")
