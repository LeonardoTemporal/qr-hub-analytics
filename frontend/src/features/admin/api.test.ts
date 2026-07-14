import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest, setCsrfToken } from "../../app/api/client";
import {
  createAdminServiceRecord,
  createAdminWorkOrder,
  createWarrantyClaim,
  loginAdmin,
  uploadAdminMedia,
  updateAdminWorkOrder,
  updateWarrantyClaim,
} from "./api";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("admin API security", () => {
  it("logs in with a first-party cookie session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          username: "admin",
          csrf_token: "csrf-token",
          expires_at: "2026-07-14T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await loginAdmin({ username: "admin", password: "owner-password" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/auth/login",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("adds CSRF only to mutating requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    setCsrfToken("csrf-token");

    await apiRequest("/api/admin/clients", { method: "POST", body: "{}" });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(request.credentials).toBe("include");
  });
});

describe("admin operational API", () => {
  it("creates and advances a work order through explicit endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ id: 4, status: "scheduled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createAdminWorkOrder({ client_id: 1, vehicle_id: 2 });
    await updateAdminWorkOrder(4, { status: "scheduled" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/work-orders");
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/work-orders/4");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "PATCH" }));
  });

  it("creates service records and manages warranty claims", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ id: 9, status: "submitted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createAdminServiceRecord({
      vehicle_id: 2,
      service_type: "PPF",
      installed_at: "2026-07-14",
      is_public: true,
    });
    await createWarrantyClaim({ warranty_policy_id: 5, description: "Desprendimiento visible en borde frontal" });
    await updateWarrantyClaim(9, { status: "under_review" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/admin/services",
      "/api/admin/warranty-claims",
      "/api/admin/warranty-claims/9",
    ]);
  });

  it("scopes uploaded evidence to a service record", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 12, service_record_ids: [7] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await uploadAdminMedia({
      file: new File(["evidence"], "fascia.webp", { type: "image/webp" }),
      visibility: "private",
      serviceRecordId: 7,
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = request.body as FormData;
    expect(body.get("service_record_id")).toBe("7");
  });
});
