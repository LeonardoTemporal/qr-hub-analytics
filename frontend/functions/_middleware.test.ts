import { describe, expect, it, vi } from "vitest";

import { proxyRequest } from "./_middleware";

const env = {
  API_ORIGIN: "https://api.7fitment.com",
  INTERNAL_PROXY_SECRET: "edge-only-secret",
};

describe("Cloudflare edge proxy", () => {
  it("forwards API requests to the configured origin with trusted headers", async () => {
    const upstreamFetch = vi.fn(async (request: Request) => {
      expect(request.url).toBe(
        "https://api.7fitment.com/api/analytics/kpis?range=30d",
      );
      expect(request.headers.get("x-qrhub-proxy-secret")).toBe(
        "edge-only-secret",
      );
      expect(request.headers.get("cf-connecting-ip")).toBe("203.0.113.8");
      expect(request.headers.get("x-real-ip")).toBe("203.0.113.8");
      expect(request.headers.get("x-forwarded-for")).toBe("203.0.113.8");
      expect(request.headers.get("x-forwarded-host")).toBe("7fitment.com");
      expect(request.headers.get("x-forwarded-proto")).toBe("https");
      return new Response("ok", {
        headers: { "set-cookie": "admin_session=secure; Secure; HttpOnly" },
      });
    });

    const response = await proxyRequest(
      new Request("https://7fitment.com/api/analytics/kpis?range=30d", {
        headers: {
          "CF-Connecting-IP": "203.0.113.8",
          "X-QRHub-Proxy-Secret": "spoofed-browser-value",
        },
      }),
      env,
      upstreamFetch,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("admin_session");
    expect(upstreamFetch).toHaveBeenCalledOnce();
  });

  it("fails open to the links page when QR tracking is unavailable", async () => {
    const response = await proxyRequest(
      new Request("https://7fitment.com/t/qr_general"),
      env,
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://7fitment.com/enlaces?qr=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns a controlled API error instead of redirecting API calls", async () => {
    const response = await proxyRequest(
      new Request("https://7fitment.com/api/admin/session"),
      env,
      vi.fn(async () => {
        throw new Error("origin offline");
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      detail: "API temporarily unavailable",
    });
  });

  it("rejects paths outside the explicit proxy allowlist", async () => {
    const upstreamFetch = vi.fn();
    const response = await proxyRequest(
      new Request("https://7fitment.com/assets/index.js"),
      env,
      upstreamFetch,
    );

    expect(response.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
