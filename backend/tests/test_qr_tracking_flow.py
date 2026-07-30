from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest
import qrcode
from fastapi import BackgroundTasks, HTTPException
from starlette.requests import Request


def _request(
    *,
    scheme: str = "http",
    headers: list[tuple[bytes, bytes]] | None = None,
    client_host: str = "127.0.0.1",
) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/qr_general",
            "headers": headers or [(b"user-agent", b"pytest")],
            "client": (client_host, 12345),
            "server": ("testserver", 80),
            "scheme": scheme,
            "query_string": b"",
        }
    )


def test_qr_redirect_is_secure_and_not_cacheable_behind_proxy(monkeypatch) -> None:
    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> int:
        return 77

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)
    monkeypatch.setattr(redirect.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    request = _request(
        headers=[
            (b"user-agent", b"pytest"),
            (b"x-forwarded-proto", b"https"),
            (b"x-qrhub-proxy-secret", b"test-proxy-secret"),
        ]
    )

    response = asyncio.run(
        redirect.redirect_campaign("qr_general", request, BackgroundTasks())
    )

    assert response.status_code == 302
    assert response.headers["location"] == "https://7fitment.com/enlaces?qr=1"
    assert "Secure" in response.headers["set-cookie"]
    assert response.headers["cache-control"] == "no-store, private, max-age=0"
    assert response.headers["pragma"] == "no-cache"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["x-robots-tag"] == "noindex, nofollow"


def test_qr_redirect_understands_cloudflare_visitor_scheme(monkeypatch) -> None:
    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> int:
        return 77

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)
    monkeypatch.setattr(redirect.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    request = _request(
        headers=[
            (b"user-agent", b"pytest"),
            (b"cf-visitor", b'{"scheme":"https"}'),
            (b"x-qrhub-proxy-secret", b"test-proxy-secret"),
        ]
    )

    response = asyncio.run(
        redirect.redirect_campaign("qr_general", request, BackgroundTasks())
    )

    assert "Secure" in response.headers["set-cookie"]


def test_local_http_redirect_does_not_force_secure_cookie(monkeypatch) -> None:
    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> int:
        return 77

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)

    response = asyncio.run(
        redirect.redirect_campaign("qr_general", _request(), BackgroundTasks())
    )

    assert "Secure" not in response.headers["set-cookie"]


def test_client_ip_skips_malformed_proxy_value(monkeypatch) -> None:
    from app.routers import redirect

    monkeypatch.setattr(redirect.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    request = _request(
        headers=[
            (b"cf-connecting-ip", b"not-an-ip"),
            (b"x-forwarded-for", b"8.8.8.8, 10.0.0.4"),
            (b"x-real-ip", b"1.1.1.1"),
            (b"x-qrhub-proxy-secret", b"test-proxy-secret"),
        ]
    )

    assert redirect._get_client_ip(request) == "8.8.8.8"


def test_client_ip_ignores_forwarded_headers_from_public_peer() -> None:
    from app.routers.redirect import _get_client_ip

    request = _request(
        headers=[(b"cf-connecting-ip", b"1.1.1.1")],
        client_host="8.8.8.8",
    )

    assert _get_client_ip(request) == "8.8.8.8"


def test_client_ip_ignores_spoofed_headers_without_proxy_secret(monkeypatch) -> None:
    from app.routers import redirect

    monkeypatch.setattr(redirect.settings, "INTERNAL_PROXY_SECRET", "real-secret")
    request = _request(
        headers=[
            (b"cf-connecting-ip", b"1.1.1.1"),
            (b"x-forwarded-for", b"8.8.8.8"),
            (b"x-qrhub-proxy-secret", b"attacker-secret"),
        ],
        client_host="10.0.0.8",
    )

    assert redirect._get_client_ip(request) == "10.0.0.8"


def test_dynamic_qr_database_failure_falls_back_to_links(monkeypatch) -> None:
    from app.routers import redirect

    def unavailable_database():
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(redirect, "AsyncSessionLocal", unavailable_database)

    target, vehicle_qr_code_id, landing_path = asyncio.run(
        redirect._resolve_redirect_target("vehicle-qr", None)
    )

    assert target == "https://7fitment.com/enlaces"
    assert vehicle_qr_code_id is None
    assert landing_path == "/enlaces"


def test_browser_location_requires_first_party_attribution_cookie() -> None:
    from app.routers.redirect import BrowserLocationPayload, update_browser_location

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            update_browser_location(
                BrowserLocationPayload(latitude=19.432, longitude=-99.133),
                _request(),
            )
        )

    assert exc_info.value.status_code == 401


def test_nginx_has_unspoofable_global_qr_circuit_breaker() -> None:
    nginx_config = (
        Path(__file__).parents[2] / "frontend" / "nginx.conf"
    ).read_text(encoding="utf-8")

    assert "zone=qr_global" in nginx_config
    assert "limit_req zone=qr_global" in nginx_config
    assert "proxy_hide_header Referrer-Policy;" in nginx_config


def test_browser_location_rejects_direct_api_bypass(monkeypatch) -> None:
    from app.routers import redirect

    monkeypatch.setattr(redirect.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    request = _request(
        headers=[(b"cookie", b"qr_attribution=valid-looking-attribution")],
        client_host="10.0.0.8",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            redirect.update_browser_location(
                redirect.BrowserLocationPayload(
                    latitude=19.432,
                    longitude=-99.133,
                ),
                request,
            )
        )

    assert exc_info.value.status_code == 403


def test_browser_location_uses_unexpired_attribution_session(monkeypatch) -> None:
    from app.routers import redirect

    scan = SimpleNamespace(
        campaign_id="qr_general",
        country="Unknown",
        state="Unknown",
        city="Unknown",
        latitude=None,
        longitude=None,
        accuracy_meters=None,
        geo_hash_5=None,
        geo_hash_7=None,
        geo_source="ip",
    )

    class FakeResult:
        def scalar_one_or_none(self):
            return scan

    class FakeSession:
        statement = None
        committed = False

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def execute(self, statement):
            self.statement = statement
            return FakeResult()

        async def commit(self) -> None:
            self.committed = True

    fake_session = FakeSession()
    monkeypatch.setattr(redirect, "AsyncSessionLocal", lambda: fake_session)

    updated = asyncio.run(
        redirect._apply_browser_location(
            redirect.BrowserLocationPayload(
                country="Mexico",
                state="Ciudad de Mexico",
                city="Miguel Hidalgo",
                latitude=19.43264,
                longitude=-99.13324,
                accuracy_meters=20,
            ),
            "first-party-token",
        )
    )

    statement = str(fake_session.statement)
    assert "scan_sessions.attribution_token" in statement
    assert "scan_sessions.expires_at >" in statement
    assert updated is True
    assert fake_session.committed is True
    assert scan.city == "Miguel Hidalgo"
    assert scan.latitude == 19.433
    assert scan.longitude == -99.133
    assert scan.accuracy_meters == 100
    assert scan.geo_source == "browser"


def test_qr_redirect_rate_limit_preserves_destination_without_tracking(monkeypatch) -> None:
    from app.routers import redirect

    class RejectLimiter:
        async def allow(self, *_args, **_kwargs) -> bool:
            return False

    monkeypatch.setattr(redirect, "_redirect_rate_limiter", RejectLimiter())
    background_tasks = BackgroundTasks()

    response = asyncio.run(
        redirect.redirect_campaign(
            "qr_general",
            _request(),
            background_tasks,
        )
    )

    assert response.status_code == 302
    assert response.headers["location"] == "https://7fitment.com/enlaces"
    assert "set-cookie" not in response.headers
    assert background_tasks.tasks == []


def test_record_scan_persists_scan_and_attribution_session(monkeypatch) -> None:
    from app.models import Scan, ScanSession
    from app.routers import redirect
    from app.services.ua_service import DeviceInfo

    class FakeUaService:
        def parse(self, _user_agent: str) -> DeviceInfo:
            return DeviceInfo(
                device_type="mobile",
                os="iOS",
                browser="Mobile Safari",
            )

    class FakeSession:
        def __init__(self) -> None:
            self.added: list[object] = []
            self.committed = False

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        def add(self, instance: object) -> None:
            self.added.append(instance)

        async def flush(self) -> None:
            scan = next(item for item in self.added if isinstance(item, Scan))
            scan.id = 77

        async def commit(self) -> None:
            self.committed = True

    fake_session = FakeSession()
    monkeypatch.setattr(redirect, "_ua_service", FakeUaService())
    monkeypatch.setattr(redirect, "AsyncSessionLocal", lambda: fake_session)

    scan_id = asyncio.run(
        redirect._record_scan(
            campaign_id="qr_general",
            user_agent_string="Mobile Safari",
            scan_token="scan-token-for-attribution",
            landing_path="/enlaces",
        )
    )

    scan = next(item for item in fake_session.added if isinstance(item, Scan))
    scan_session = next(
        item for item in fake_session.added if isinstance(item, ScanSession)
    )
    assert fake_session.committed is True
    assert scan_id == 77
    assert scan.campaign_id == "qr_general"
    assert scan.city == "Unknown"
    assert scan.device_type == "mobile"
    assert scan.latitude is None
    assert scan_session.scan_id == 77
    assert scan_session.attribution_token == "scan-token-for-attribution"
    assert scan_session.landing_path == "/enlaces"


def test_geoip_enrichment_uses_atomic_browser_location_guard(monkeypatch) -> None:
    from app.routers import redirect
    from app.services.geo_service import GeoLocation

    class FakeGeoService:
        async def lookup(self, _ip_address: str) -> GeoLocation:
            return GeoLocation(
                country="United States",
                state="California",
                city="Mountain View",
                latitude=37.386,
                longitude=-122.084,
                accuracy_meters=5000,
            )

    class FakeSession:
        committed = False
        statement = None

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def execute(self, statement):
            self.statement = statement

        async def commit(self) -> None:
            self.committed = True

    fake_session = FakeSession()
    monkeypatch.setattr(redirect, "_geo_service", FakeGeoService())
    monkeypatch.setattr(redirect, "AsyncSessionLocal", lambda: fake_session)

    asyncio.run(redirect._enrich_scan_geo(77, "8.8.8.8"))

    statement = str(fake_session.statement)
    assert "scans.id =" in statement
    assert "scans.geo_source IS NULL OR scans.geo_source !=" in statement
    assert fake_session.committed is True


def test_tracking_event_rejects_request_without_qr_attribution() -> None:
    from app.domains.tracking.router import TrackingEventRequest, collect_event

    payload = TrackingEventRequest(
        event_type="destination_view",
        path="/enlaces",
        idempotency_key="f50a5807-88f9-4db0-887f-8a89c31c31d5",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            collect_event(
                payload=payload,
                request=_request(),
                session=SimpleNamespace(),
                qr_attribution=None,
            )
        )

    assert exc_info.value.status_code == 401


def test_tracking_event_contract_rejects_unbounded_input() -> None:
    from pydantic import ValidationError

    from app.domains.tracking.router import TrackingEventRequest

    with pytest.raises(ValidationError):
        TrackingEventRequest(
            event_type="arbitrary_metric",
            path="/enlaces",
            idempotency_key="f50a5807-88f9-4db0-887f-8a89c31c31d5",
        )
    with pytest.raises(ValidationError):
        TrackingEventRequest(
            event_type="cta_click",
            path="/enlaces",
            idempotency_key="f50a5807-88f9-4db0-887f-8a89c31c31d5",
            metadata={"payload": "x" * 2_100},
        )


def test_tracking_event_rate_limit_returns_429(monkeypatch) -> None:
    from app.domains.tracking import router

    class RejectLimiter:
        async def allow(self, *_args, **_kwargs) -> bool:
            return False

    monkeypatch.setattr(router, "_event_rate_limiter", RejectLimiter())
    monkeypatch.setattr(router.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    payload = router.TrackingEventRequest(
        event_type="cta_click",
        path="/enlaces",
        element_id="whatsapp",
        idempotency_key="f50a5807-88f9-4db0-887f-8a89c31c31d5",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            router.collect_event(
                payload=payload,
                request=_request(
                    headers=[
                        (b"x-qrhub-proxy-secret", b"test-proxy-secret"),
                    ]
                ),
                session=SimpleNamespace(),
                qr_attribution="valid-looking-attribution",
            )
        )

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers == {"Retry-After": "60"}


def test_tracking_event_rejects_direct_api_bypass(monkeypatch) -> None:
    from app.domains.tracking import router

    monkeypatch.setattr(router.settings, "INTERNAL_PROXY_SECRET", "test-proxy-secret")
    payload = router.TrackingEventRequest(
        event_type="cta_click",
        path="/enlaces",
        idempotency_key="f50a5807-88f9-4db0-887f-8a89c31c31d5",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            router.collect_event(
                payload=payload,
                request=_request(client_host="10.0.0.8"),
                session=SimpleNamespace(),
                qr_attribution="valid-looking-attribution",
            )
        )

    assert exc_info.value.status_code == 403


def test_tracking_request_body_is_rejected_before_json_validation() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    response = TestClient(app).post(
        "/api/tracking/events",
        content=b'{"ignored":"' + (b"x" * 20_000) + b'"}',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413


def test_proxy_and_edge_limits_are_wired_for_production() -> None:
    repository_root = Path(__file__).resolve().parents[2]
    compose = (repository_root / "docker-compose.yml").read_text(encoding="utf-8")
    nginx = (repository_root / "frontend" / "nginx.conf").read_text(encoding="utf-8")
    vite = (repository_root / "frontend" / "vite.config.ts").read_text(encoding="utf-8")

    assert "INTERNAL_PROXY_SECRET must be configured" in compose
    assert 'Host(`api.7fitment.com`) && PathPrefix(`/api`)' in compose
    assert "limit_req_zone $qr_client_ip zone=browser_location" in nginx
    assert "limit_req_zone $qr_client_ip zone=tracking_events" in nginx
    assert "zone=qr_redirects" in nginx
    assert "error_page 429 502 503 504 = @qr_fallback" in nginx
    assert "client_max_body_size 16k" in nginx
    assert 'X-QRHub-Proxy-Secret "${INTERNAL_PROXY_SECRET}"' in nginx
    assert '"X-QRHub-Proxy-Secret": internalProxySecret' in vite


def test_campaign_qr_generator_writes_print_assets(tmp_path) -> None:
    from PIL import Image

    from scripts.generate_campaign_qr import (
        DEFAULT_TARGET_URL,
        generate_campaign_qr,
    )

    png_path, svg_path = generate_campaign_qr(DEFAULT_TARGET_URL, tmp_path)

    assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    assert svg_path.read_text(encoding="utf-8").lstrip().startswith("<?xml")
    with Image.open(png_path) as image:
        assert image.width == image.height
        assert image.width >= 500
        assert len(image.getcolors(maxcolors=4) or []) == 2
        _assert_qr_matrix_matches_target(image, DEFAULT_TARGET_URL)
    assert svg_path.stat().st_size > 1_000


def test_committed_campaign_qr_encodes_canonical_tracking_url() -> None:
    from PIL import Image

    from scripts.generate_campaign_qr import DEFAULT_TARGET_URL

    asset_path = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "public"
        / "assets"
        / "qr"
        / "7fitment-qr-general.png"
    )

    with Image.open(asset_path) as image:
        _assert_qr_matrix_matches_target(image, DEFAULT_TARGET_URL)


def test_campaign_qr_generator_rejects_insecure_target(tmp_path) -> None:
    from scripts.generate_campaign_qr import generate_campaign_qr

    with pytest.raises(ValueError, match="HTTPS"):
        generate_campaign_qr("http://7fitment.com/t/qr_general", tmp_path)


def _assert_qr_matrix_matches_target(image, target_url: str) -> None:
    expected = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=4,
    )
    expected.add_data(target_url)
    expected.make(fit=True)
    matrix = expected.get_matrix()

    monochrome = image.convert("1")
    module_count = len(matrix)
    assert monochrome.width % module_count == 0
    module_size = monochrome.width // module_count

    for row_index, row in enumerate(matrix):
        for column_index, module_is_dark in enumerate(row):
            x = column_index * module_size + module_size // 2
            y = row_index * module_size + module_size // 2
            assert (monochrome.getpixel((x, y)) == 0) is module_is_dark
