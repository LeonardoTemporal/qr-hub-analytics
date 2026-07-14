import { afterEach, describe, expect, it, vi } from "vitest";

import { createGarageWarrantyClaim } from "./api";

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
