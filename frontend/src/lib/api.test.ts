import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createGarageWarrantyClaim,
  submitBrowserLocation,
  trackQrEvent,
} from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("garage portal API", () => {
  it("submits a warranty claim with the scoped portal token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 8,
          claim_number: "CLM-20260714-ABC123",
          warranty_policy_id: 5,
          status: "submitted",
          description: "Borde levantado en fascia frontal",
          created_at: "2026-07-14T12:00:00Z",
          evidence: [],
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await createGarageWarrantyClaim("portal-token", {
      warranty_policy_id: 5,
      description: "Borde levantado en fascia frontal",
      incident_at: "2026-07-13",
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/garage/portal/claims");
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer portal-token");
  });
});

describe("first-party QR analytics", () => {
  it("submits browser location through the same-origin attribution cookie", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, updated: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(submitBrowserLocation({
      latitude: 19.432,
      longitude: -99.133,
      accuracy_meters: 100,
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/browser-location",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("records attributed events through the same-origin cookie", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ accepted: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      trackQrEvent({ event_type: "destination_view", path: "/enlaces" }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tracking/events",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      event_type: string;
      idempotency_key: string;
    };
    expect(body.event_type).toBe("destination_view");
    expect(body.idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
