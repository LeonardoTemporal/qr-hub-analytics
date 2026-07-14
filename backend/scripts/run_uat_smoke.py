from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
import time

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.uat import UAT_PUBLIC_SLUG, UAT_QR_ID, validate_uat_pin


def require_status(response: httpx.Response, expected: int, step: str) -> None:
    if response.status_code != expected:
        raise RuntimeError(
            f"{step} failed: expected HTTP {expected}, received {response.status_code}: "
            f"{response.text[:240]}"
        )
    print(f"PASS {step}: HTTP {expected}")


def run(base_url: str, pin: str) -> None:
    normalized_base = base_url.rstrip("/")
    with httpx.Client(base_url=normalized_base, timeout=10, follow_redirects=False) as client:
        response = client.get("/ready")
        require_status(response, 200, "database readiness")

        response = client.get(
            f"/t/{UAT_QR_ID}",
            headers={"User-Agent": "7Fitment-UAT/1.0 (mobile acceptance)"},
        )
        require_status(response, 302, "vehicle QR redirect")
        location = response.headers.get("location", "")
        if f"/auto/{UAT_PUBLIC_SLUG}" not in location or "scan=" not in location:
            raise RuntimeError(f"vehicle QR returned an unexpected destination: {location}")
        if "qr_attribution" not in client.cookies:
            raise RuntimeError("vehicle QR did not set the attribution cookie")
        print("PASS QR destination and first-party attribution")

        time.sleep(0.4)
        response = client.post(
            "/api/tracking/events",
            json={
                "event_type": "showcase_view",
                "path": f"/auto/{UAT_PUBLIC_SLUG}",
                "idempotency_key": "uat-release-showcase-view",
                "metadata": {"fixture": "uat"},
            },
        )
        require_status(response, 202, "QR-attributed analytics event")

        with httpx.Client(base_url=normalized_base, timeout=10) as organic_client:
            response = organic_client.post(
                "/api/tracking/events",
                json={"event_type": "organic_view", "path": "/"},
            )
            require_status(response, 401, "organic analytics rejection")

        response = client.get(f"/api/garage/showcase/{UAT_PUBLIC_SLUG}")
        require_status(response, 200, "public vehicle showcase")
        showcase = response.json()
        if showcase["vehicle"]["brand"] != "Porsche" or not showcase["services"]:
            raise RuntimeError("showcase payload is missing the UAT vehicle or service")
        if len(showcase["services"][0]["media"]) < 3:
            raise RuntimeError("showcase payload does not include the reference media set")
        print("PASS public/private showcase projection")

        response = client.post("/api/garage/portal/auth", json={"pin": pin})
        require_status(response, 200, "portal PIN authentication")
        auth = response.json()
        token = auth["access_token"]
        portal_headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/garage/portal/data", headers=portal_headers)
        require_status(response, 200, "private garage record")
        portal = response.json()
        if portal["vehicle"]["vin"] != "UAT7F911GT3RS2026":
            raise RuntimeError("portal token resolved a vehicle outside the UAT fixture")
        if not portal["warranties"] or portal["warranties"][0]["status"] != "active":
            raise RuntimeError("portal payload is missing the active UAT warranty")
        print("PASS private vehicle, service and warranty data")

        policy_id = portal["warranties"][0]["id"]
        response = client.post(
            "/api/garage/portal/claims",
            headers=portal_headers,
            json={
                "warranty_policy_id": policy_id,
                "description": "Solicitud sintetica para validar el recorrido de garantia.",
            },
        )
        require_status(response, 201, "portal warranty claim")
        if response.json()["status"] != "submitted":
            raise RuntimeError("new warranty claim did not enter submitted status")

        response = client.get("/api/garage/portal/data", headers=portal_headers)
        require_status(response, 200, "portal refresh after claim")
        if not response.json()["warranty_claims"]:
            raise RuntimeError("submitted claim is missing from the refreshed portal")
        print("PASS end-to-end UAT flow")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--pin-env", required=True)
    args = parser.parse_args()

    pin = os.getenv(args.pin_env)
    if not pin:
        raise SystemExit(f"Required environment variable is not set: {args.pin_env}")
    try:
        run(args.base_url, validate_uat_pin(pin))
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
