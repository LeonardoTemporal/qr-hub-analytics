from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request


def test_evolution_tables_are_registered_in_metadata() -> None:
    from app.database import Base
    from app import models  # noqa: F401

    expected = {
        "admin_users",
        "admin_sessions",
        "audit_log",
        "service_catalog",
        "work_orders",
        "work_order_items",
        "warranty_templates",
        "warranty_policies",
        "warranty_claims",
        "warranty_claim_media",
        "media_assets",
        "showcase_profiles",
        "showcase_social_proof",
        "workshop_profile",
        "scan_sessions",
        "analytics_events",
        "conversions",
        "event_outbox",
        "background_jobs",
        "analytics_daily_aggregates",
        "analytics_monthly_aggregates",
    }

    assert expected <= set(Base.metadata.tables)


def test_admin_password_hash_round_trip_and_rejects_wrong_password() -> None:
    from app.domains.admin.security import hash_password, verify_password

    encoded = hash_password("owner-secret")

    assert encoded != "owner-secret"
    assert verify_password("owner-secret", encoded) is True
    assert verify_password("wrong-secret", encoded) is False


def test_admin_session_token_exposes_only_digest_for_storage() -> None:
    from app.domains.admin.security import create_session_token, digest_token

    token, digest = create_session_token()

    assert token != digest
    assert digest_token(token) == digest
    assert len(digest) == 64


def test_admin_login_rate_limit_blocks_repeated_attempts(monkeypatch) -> None:
    import asyncio

    from app.domains.admin import router
    from app.services.rate_limit_service import SlidingWindowRateLimiter

    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/admin/auth/login",
            "headers": [],
            "client": ("203.0.113.10", 12345),
            "server": ("testserver", 80),
            "scheme": "https",
            "query_string": b"",
        }
    )
    monkeypatch.setattr(
        router,
        "_admin_login_rate_limiter",
        SlidingWindowRateLimiter(clock=lambda: 10.0),
    )
    monkeypatch.setattr(router.settings, "ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE", 2)

    asyncio.run(router._enforce_admin_login_rate_limit(request))
    asyncio.run(router._enforce_admin_login_rate_limit(request))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(router._enforce_admin_login_rate_limit(request))

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers == {"Retry-After": "60"}


def test_attribution_window_is_valid_for_thirty_days() -> None:
    from app.domains.tracking.service import attribution_expires_at

    now = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)

    assert attribution_expires_at(now) == now + timedelta(days=30)


def test_new_public_admin_and_tracking_routes_are_registered() -> None:
    from app.main import app

    paths = set(app.openapi()["paths"])

    assert "/api/admin/auth/login" in paths
    assert "/api/admin/auth/session" in paths
    assert "/api/admin/auth/credentials" in paths
    assert "/api/admin/clients" in paths
    assert "/api/admin/vehicles" in paths
    assert "/api/admin/work-orders" in paths
    assert "/api/admin/warranties" in paths
    assert "/api/admin/media" in paths
    assert "/api/admin/qr-codes" in paths
    assert "/api/admin/showcases/{vehicle_id}/publish" in paths
    assert "/api/admin/service-catalog" in paths
    assert "/api/admin/service-catalog/{service_id}" in paths
    assert "/api/admin/workshop-profile" in paths
    assert "/api/public/site" in paths
    assert "/api/tracking/events" in paths
    assert "/api/admin/analytics/funnel" in paths
    assert "/api/admin/analytics/summary" in paths
    assert "/api/admin/analytics/timeline" in paths
    assert "/api/admin/analytics/sources" in paths


def test_admin_credential_update_requires_a_real_change() -> None:
    from app.domains.admin.router import AdminCredentialUpdate

    with pytest.raises(ValidationError):
        AdminCredentialUpdate(current_password="owner-password")

    payload = AdminCredentialUpdate(
        current_password="owner-password",
        new_username="  owner.7f  ",
        new_password="a-stronger-password-2026",
    )

    assert payload.new_username == "owner.7f"
    assert payload.new_password == "a-stronger-password-2026"


def test_workshop_profile_rejects_unsafe_instagram_url() -> None:
    from app.domains.workshop.schemas import WorkshopProfileUpdate

    with pytest.raises(ValidationError):
        WorkshopProfileUpdate(instagram_url="javascript:alert(1)")
    with pytest.raises(ValidationError):
        WorkshopProfileUpdate(instagram_url="https://example.com/7fitment")

    payload = WorkshopProfileUpdate(
        instagram_url="https://www.instagram.com/7fitment/"
    )
    assert payload.instagram_url == "https://www.instagram.com/7fitment/"


def test_redirect_response_sets_first_party_attribution_cookie(monkeypatch) -> None:
    import asyncio

    from fastapi import BackgroundTasks
    from starlette.requests import Request

    from app.routers import redirect

    async def noop_record_scan(*_args, **_kwargs) -> int:
        return 77

    monkeypatch.setattr(redirect, "_record_scan", noop_record_scan)

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/t/qr_general",
            "headers": [(b"user-agent", b"pytest")],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "https",
            "query_string": b"",
        }
    )

    response = asyncio.run(
        redirect.redirect_campaign("qr_general", request, BackgroundTasks())
    )

    cookie = response.headers.get("set-cookie", "")
    assert "qr_attribution=" in cookie
    assert "Max-Age=2592000" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_service_media_can_reference_managed_asset() -> None:
    from app.database import Base
    from app import models  # noqa: F401

    assert "media_asset_id" in Base.metadata.tables["service_media"].columns


def test_admin_resources_expose_create_and_update_methods() -> None:
    from app.main import app

    methods_by_path = {
        path: {method.upper() for method in operations}
        for path, operations in app.openapi()["paths"].items()
    }

    for path in (
        "/api/admin/clients",
        "/api/admin/vehicles",
        "/api/admin/work-orders",
        "/api/admin/warranties",
        "/api/admin/qr-codes",
    ):
        assert "GET" in methods_by_path[path]
        assert "POST" in methods_by_path[path]

    assert "PATCH" in methods_by_path["/api/admin/work-orders/{work_order_id}"]
    assert "PATCH" in methods_by_path["/api/admin/clients/{client_id}"]
    assert "PATCH" in methods_by_path["/api/admin/vehicles/{vehicle_id}"]
    assert "PATCH" in methods_by_path["/api/admin/services/{service_record_id}"]
    assert "PATCH" in methods_by_path["/api/admin/warranties/{warranty_id}"]
    assert "PATCH" in methods_by_path["/api/admin/qr-codes/{qr_code_id}"]


def test_work_order_items_and_warranty_claim_routes_are_registered() -> None:
    from app.main import app

    methods_by_path = {
        path: {method.upper() for method in operations}
        for path, operations in app.openapi()["paths"].items()
    }

    assert {"GET", "POST"} <= methods_by_path[
        "/api/admin/work-orders/{work_order_id}/items"
    ]
    assert "PATCH" in methods_by_path["/api/admin/work-order-items/{item_id}"]
    assert {"GET", "POST"} <= methods_by_path["/api/admin/warranty-claims"]
    assert "PATCH" in methods_by_path["/api/admin/warranty-claims/{claim_id}"]
    assert "POST" in methods_by_path["/api/garage/portal/claims"]
    assert "GET" in methods_by_path["/api/garage/media/{asset_id}"]


def test_warranty_claim_contract_links_policy_vehicle_and_evidence() -> None:
    from app.database import Base
    from app import models  # noqa: F401

    claims = Base.metadata.tables["warranty_claims"].columns
    evidence = Base.metadata.tables["warranty_claim_media"].columns

    assert {
        "claim_number",
        "warranty_policy_id",
        "vehicle_id",
        "status",
        "description",
        "incident_at",
        "resolution_notes",
        "resolved_at",
    } <= set(claims.keys())
    assert {"warranty_claim_id", "media_asset_id"} <= set(evidence.keys())


def test_private_media_token_is_scoped_and_expires(monkeypatch) -> None:
    from app import security

    monkeypatch.setattr(security.settings, "PORTAL_TOKEN_SECRET", "test-media-secret")
    issued_at = 1_800_000_000
    token = security.create_media_token(
        asset_id=44,
        vehicle_id=7,
        ttl_seconds=120,
        now=issued_at,
    )

    assert security.verify_media_token(
        token,
        asset_id=44,
        vehicle_id=7,
        now=issued_at + 119,
    )
    assert not security.verify_media_token(
        token,
        asset_id=45,
        vehicle_id=7,
        now=issued_at + 20,
    )
    assert not security.verify_media_token(
        token,
        asset_id=44,
        vehicle_id=8,
        now=issued_at + 20,
    )
    assert not security.verify_media_token(
        token,
        asset_id=44,
        vehicle_id=7,
        now=issued_at + 121,
    )


def test_portal_token_secret_never_silently_uses_an_empty_key(monkeypatch) -> None:
    import pytest

    from app import security

    monkeypatch.setattr(security.settings, "PORTAL_TOKEN_SECRET", None)
    monkeypatch.setattr(security.settings, "ADMIN_PASSWORD", "")

    with pytest.raises(RuntimeError, match="PORTAL_TOKEN_SECRET"):
        security.create_portal_token(7)


def test_portal_token_secret_never_reuses_admin_password(monkeypatch) -> None:
    from app import security

    monkeypatch.setattr(security.settings, "PORTAL_TOKEN_SECRET", None)
    monkeypatch.setattr(security.settings, "ADMIN_PASSWORD", "admin-only-secret")

    with pytest.raises(RuntimeError, match="PORTAL_TOKEN_SECRET"):
        security.create_portal_token(7)


def test_admin_media_contract_exposes_service_scope() -> None:
    from app.domains.media.router import MediaAssetRead

    assert "service_record_ids" in MediaAssetRead.model_fields


def test_policy_snapshot_is_detached_from_template_data() -> None:
    from app.domains.warranties.service import build_policy_snapshot

    coverage = ["Amarillamiento", "Delaminacion"]
    snapshot = build_policy_snapshot(
        template_code="ppf-complete",
        template_version=3,
        coverage=coverage,
        exclusions=["Colision"],
        care_instructions=["Lavado manual"],
        workmanship_warranty_years=2,
        manufacturer_warranty_years=10,
    )
    coverage.append("Cambio posterior")

    assert snapshot["template_code"] == "ppf-complete"
    assert snapshot["coverage"] == ["Amarillamiento", "Delaminacion"]
    assert snapshot["currency"] == "MXN"


def test_warranty_number_is_operator_supplied_and_required() -> None:
    from app.domains.workshop.schemas import WarrantyCreate

    payload = {
        "vehicle_id": 1,
        "service_record_id": 2,
        "effective_date": "2026-07-14",
        "expiration_date": "2031-07-13",
    }

    with pytest.raises(ValidationError):
        WarrantyCreate.model_validate(payload)

    warranty = WarrantyCreate.model_validate(
        {**payload, "policy_number": "  POLIZA-EXTERNA-001  "}
    )

    assert warranty.policy_number == "POLIZA-EXTERNA-001"


def test_work_order_status_transitions_are_explicit() -> None:
    from app.domains.workshop.service import can_transition_work_order

    assert can_transition_work_order("draft", "scheduled") is True
    assert can_transition_work_order("quality_check", "ready") is True
    assert can_transition_work_order("delivered", "in_progress") is False
    assert can_transition_work_order("cancelled", "scheduled") is False


def test_garage_contract_exposes_showcase_story_and_private_warranties() -> None:
    from app.routers.garage import PortalDataResponse, ShowcaseResponse

    assert "profile" in ShowcaseResponse.model_fields
    assert "social_proof" in ShowcaseResponse.model_fields
    assert "warranties" in PortalDataResponse.model_fields
    assert "warranties" not in ShowcaseResponse.model_fields


def test_media_storage_key_never_uses_client_path() -> None:
    from app.domains.media.service import build_storage_key

    key = build_storage_key("../../Porsche GT3 FINAL!!.JPG")

    assert ".." not in key
    assert " " not in key
    assert key.endswith(".jpg")
    assert key.startswith("originals/")


def test_worker_registers_required_platform_jobs() -> None:
    from app.worker import JOB_HANDLERS

    assert {
        "media.generate_derivatives",
        "analytics.retention",
        "analytics.refresh_aggregates",
        "outbox.dispatch",
    } <= set(JOB_HANDLERS)


def test_vehicle_pin_throttle_locks_after_five_failures() -> None:
    from app.domains.garage.security import is_pin_locked, register_pin_failure

    vehicle = SimpleNamespace(failed_pin_attempts=0, pin_locked_until=None)
    now = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)

    for _ in range(4):
        register_pin_failure(vehicle, now)
        assert is_pin_locked(vehicle, now) is False

    register_pin_failure(vehicle, now)

    assert is_pin_locked(vehicle, now) is True
    assert vehicle.pin_locked_until == now + timedelta(minutes=15)


def test_successful_pin_resets_throttle_state() -> None:
    from app.domains.garage.security import clear_pin_failures

    vehicle = SimpleNamespace(
        failed_pin_attempts=4,
        pin_locked_until=datetime(2026, 7, 13, 12, 15, tzinfo=UTC),
    )

    clear_pin_failures(vehicle)

    assert vehicle.failed_pin_attempts == 0
    assert vehicle.pin_locked_until is None


def test_warranty_contract_contains_p0_care_fields() -> None:
    from app.database import Base
    from app import models  # noqa: F401

    columns = Base.metadata.tables["warranty_policies"].columns
    expected = {
        "workmanship_warranty_years",
        "workmanship_warranty_expires_at",
        "drying_method",
        "water_temperature",
        "first_wash_after_days",
        "curing_period_hours",
        "no_water_hours",
        "no_detergent_days",
        "maintenance_inspection_frequency_months",
        "covered_areas",
        "covered_surfaces",
        "annual_inspection_required",
        "warranty_card_number",
    }

    assert expected <= set(columns.keys())


def test_warranty_rejects_less_than_profeco_minimum() -> None:
    from datetime import date

    import pytest
    from pydantic import ValidationError

    from app.domains.workshop.schemas import WarrantyCreate

    with pytest.raises(ValidationError):
        WarrantyCreate(
            vehicle_id=1,
            service_record_id=1,
            effective_date=date(2026, 7, 1),
            expiration_date=date(2026, 8, 1),
        )


def test_social_proof_requires_consent_fields() -> None:
    from app.database import Base
    from app import models  # noqa: F401

    columns = Base.metadata.tables["showcase_social_proof"].columns

    assert {"client_approved_at", "client_approved_ip"} <= set(columns.keys())


def test_work_order_accepts_optional_qr_referral_token() -> None:
    from app.domains.workshop.schemas import WorkOrderCreate

    payload = WorkOrderCreate(client_id=1, vehicle_id=2, referral_token="opaque-qr-token-2026")

    assert payload.referral_token == "opaque-qr-token-2026"


def test_service_catalog_money_is_mxn_and_bounded() -> None:
    import pytest
    from pydantic import ValidationError

    from app.domains.workshop.schemas import ServiceCatalogCreate

    service = ServiceCatalogCreate(
        code="ppf-complete",
        name="PPF Completo",
        service_type="PPF",
        base_price_mxn=125_000,
    )
    assert service.base_price_mxn == 125_000

    with pytest.raises(ValidationError):
        ServiceCatalogCreate(
            code="invalid",
            name="Precio invalido",
            service_type="PPF",
            base_price_mxn=10_000_001,
        )
