from __future__ import annotations

from datetime import date

import pytest


def test_uat_spec_uses_reserved_identity_and_public_media() -> None:
    from app.uat import build_uat_spec

    spec = build_uat_spec(date(2026, 7, 14))

    assert spec.client_email.endswith("@7fitment.invalid")
    assert spec.vehicle_vin.startswith("UAT7F")
    assert spec.qr_id.startswith("uat-")
    assert spec.public_slug.startswith("uat-")
    assert spec.installed_at < spec.warranty_expires_at
    assert len(spec.media_urls) == 3
    assert all(path.startswith("/assets/media/work/") for path in spec.media_urls)


def test_uat_spec_is_deterministic_for_the_same_release_date() -> None:
    from app.uat import build_uat_spec

    release_date = date(2026, 7, 14)

    assert build_uat_spec(release_date) == build_uat_spec(release_date)


@pytest.mark.parametrize("pin", ["", "1234", "     "])
def test_uat_pin_rejects_short_or_blank_values(pin: str) -> None:
    from app.uat import validate_uat_pin

    with pytest.raises(ValueError, match="at least 5"):
        validate_uat_pin(pin)


def test_uat_pin_accepts_a_nontrivial_value() -> None:
    from app.uat import validate_uat_pin

    assert validate_uat_pin("7F-TEST") == "7F-TEST"
