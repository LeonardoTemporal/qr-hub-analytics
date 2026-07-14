from __future__ import annotations

import asyncio


def test_readiness_check_queries_postgresql() -> None:
    from app.main import readiness_check

    class FakeSession:
        called = False

        async def execute(self, _statement) -> None:
            self.called = True

    session = FakeSession()

    assert asyncio.run(readiness_check(session)) == {"status": "ready"}
    assert session.called is True


def test_required_routes_are_registered() -> None:
    from app.main import app

    paths = set(app.openapi()["paths"].keys())

    assert "/r/{campaign_id}" in paths
    assert "/t/{campaign_id}" in paths
    assert "/qr/{campaign_id}" in paths
    assert "/api/analytics/browser-location" in paths
    assert "/api/auth/session" in paths
    assert "/api/analytics/kpis" in paths
    assert "/api/analytics/distribution" in paths
    assert "/api/analytics/geo" in paths
    assert "/api/analytics/scans" in paths
    assert "/api/analytics/timeline" in paths
    assert "/api/garage/showcase/{slug_or_id}" in paths
    assert "/api/garage/portal/auth" in paths
    assert "/api/garage/portal/data" in paths


def test_redirect_target_uses_frontend_enlaces_without_double_slashes() -> None:
    from app.routers.redirect import _build_redirect_target

    assert _build_redirect_target("https://7fitment.com") == (
        "https://7fitment.com/enlaces"
    )
    assert _build_redirect_target("https://7fitment.com/") == (
        "https://7fitment.com/enlaces"
    )
    assert _build_redirect_target("https://7fitment.com", "qr_print_satellite") == (
        "https://7fitment.com/enlaces"
    )
    assert _build_redirect_target("https://7fitment.com", "qr_general") == (
        "https://7fitment.com/enlaces"
    )
    assert _build_redirect_target(
        "https://7fitment.com",
        "qr_general",
        "scan-token-123",
    ) == "https://7fitment.com/enlaces?scan=scan-token-123"


def test_web_tracking_campaigns_redirect_to_social_destinations() -> None:
    from app.routers.redirect import _build_redirect_target

    assert _build_redirect_target(
        "https://7fitment.com",
        "web_whatsapp",
    ).startswith("https://wa.me/5215637940104")
    assert _build_redirect_target(
        "https://7fitment.com",
        "web_instagram",
    ) == "https://www.instagram.com/7fitment/"


def test_tracking_endpoint_returns_social_redirect_without_following(
    monkeypatch,
) -> None:
    from fastapi import BackgroundTasks
    from starlette.requests import Request

    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> None:
        return None

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/web_instagram",
            "headers": [(b"user-agent", b"pytest")],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )
    background_tasks = BackgroundTasks()
    response = asyncio.run(
        redirect.redirect_campaign("web_instagram", request, background_tasks)
    )

    assert response.status_code == 302
    assert response.headers["location"] == "https://www.instagram.com/7fitment/"
    assert len(background_tasks.tasks) == 0


def test_qr_general_tracking_endpoint_enqueues_analytics(monkeypatch) -> None:
    from fastapi import BackgroundTasks
    from starlette.requests import Request

    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> None:
        return None

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/qr_general",
            "headers": [(b"user-agent", b"pytest")],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )
    background_tasks = BackgroundTasks()
    response = asyncio.run(
        redirect.redirect_campaign("qr_general", request, background_tasks)
    )

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://7fitment.com/enlaces?scan=")
    assert len(background_tasks.tasks) == 1


def test_client_ip_prefers_forwarded_headers() -> None:
    from starlette.requests import Request

    from app.routers.redirect import _get_client_ip

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/qr_print",
            "headers": [
                (b"cf-connecting-ip", b"198.51.100.40"),
                (b"x-forwarded-for", b"203.0.113.10, 10.0.0.4"),
                (b"x-real-ip", b"198.51.100.20"),
            ],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )

    assert _get_client_ip(request) == "198.51.100.40"


def test_client_ip_falls_back_to_first_forwarded_ip() -> None:
    from starlette.requests import Request

    from app.routers.redirect import _get_client_ip

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/qr_print",
            "headers": [
                (b"x-forwarded-for", b"203.0.113.10, 10.0.0.4"),
                (b"x-real-ip", b"198.51.100.20"),
            ],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )

    assert _get_client_ip(request) == "203.0.113.10"


def test_ip_api_geo_service_maps_state_and_city(monkeypatch) -> None:
    import httpx

    from app.services.geo_service import IPApiGeoService

    class DummyClient:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def get(self, url: str, **_kwargs):
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "country": "Mexico",
                    "regionName": "Estado de Mexico",
                    "city": "Naucalpan de Juarez",
                },
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr("app.services.geo_service.httpx.AsyncClient", DummyClient)

    geo = asyncio.run(IPApiGeoService().lookup("8.8.8.8"))

    assert geo.country == "Mexico"
    assert geo.state == "Estado de Mexico"
    assert geo.city == "Naucalpan de Juarez"


def test_ip_api_geo_service_maps_coordinates(monkeypatch) -> None:
    import httpx

    from app.services.geo_service import IPApiGeoService

    class DummyClient:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def get(self, url: str, **_kwargs):
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "country": "Mexico",
                    "regionName": "Ciudad de Mexico",
                    "city": "Miguel Hidalgo",
                    "lat": 19.4326,
                    "lon": -99.1332,
                },
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr("app.services.geo_service.httpx.AsyncClient", DummyClient)

    geo = asyncio.run(IPApiGeoService().lookup("8.8.8.8"))

    assert geo.latitude == 19.4326
    assert geo.longitude == -99.1332
    assert geo.accuracy_meters == 5000


def test_compute_scan_geohashes_returns_level_5_and_7() -> None:
    from app.services.geohash_service import compute_scan_geohashes

    geo_hash_5, geo_hash_7 = compute_scan_geohashes(19.4326, -99.1332)

    assert geo_hash_5 == geo_hash_7[:5]
    assert len(geo_hash_5) == 5
    assert len(geo_hash_7) == 7


def test_scan_sort_rejects_unknown_column() -> None:
    from app.routers.analytics import _normalise_scan_sort

    try:
        _normalise_scan_sort("internal_notes", "desc")
    except ValueError as exc:
        assert "sort_by" in str(exc)
    else:
        raise AssertionError("invalid sort_by should fail")


def test_ip_api_geo_service_degrades_to_unknown_on_timeout(monkeypatch) -> None:
    import httpx

    from app.services.geo_service import IPApiGeoService

    class TimeoutClient:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def get(self, *_args, **_kwargs):
            raise httpx.TimeoutException("geo lookup timed out")

    monkeypatch.setattr("app.services.geo_service.httpx.AsyncClient", TimeoutClient)

    geo = asyncio.run(IPApiGeoService(timeout_seconds=0.01).lookup("8.8.8.8"))

    assert geo.country == "Unknown"
    assert geo.state == "Unknown"
    assert geo.city == "Unknown"


def test_ip_api_geo_service_skips_private_ips(monkeypatch) -> None:
    from app.services.geo_service import IPApiGeoService

    class FailingClient:
        def __init__(self, *_args, **_kwargs) -> None:
            raise AssertionError("Private IPs must not call external GeoIP API")

    monkeypatch.setattr("app.services.geo_service.httpx.AsyncClient", FailingClient)

    geo = asyncio.run(IPApiGeoService().lookup("10.0.0.4"))

    assert geo.country == "Unknown"
    assert geo.state == "Unknown"
    assert geo.city == "Unknown"


def test_portal_pin_hash_verifies_successfully() -> None:
    from app.security import hash_pin, verify_pin

    stored_hash = hash_pin("7F-2026")

    assert verify_pin("7F-2026", stored_hash) is True


def test_portal_pin_hash_rejects_wrong_pin() -> None:
    from app.security import hash_pin, verify_pin

    stored_hash = hash_pin("7F-2026")

    assert verify_pin("0000", stored_hash) is False
