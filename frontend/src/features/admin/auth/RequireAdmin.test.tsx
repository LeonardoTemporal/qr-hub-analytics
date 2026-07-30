import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequireAdmin from "./RequireAdmin";

const adminSession = vi.hoisted(() => ({
  loading: false,
  session: null as null | {
    username: string;
    csrf_token: string;
    expires_at: string;
  },
}));

vi.mock("./AdminSessionProvider", () => ({
  useAdminSession: () => ({
    ...adminSession,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

function LoginStateProbe() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return <p>login-from:{state?.from ?? "none"}</p>;
}

function ProtectedLayout() {
  return (
    <div>
      <p>protected-layout</p>
      <Outlet />
    </div>
  );
}

function renderProtectedRoute(path = "/admin/orders") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/login" element={<LoginStateProbe />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<ProtectedLayout />}>
            <Route path="orders" element={<p>orders-page</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAdmin", () => {
  beforeEach(() => {
    adminSession.loading = false;
    adminSession.session = null;
  });

  it("redirects anonymous users and preserves their intended destination", () => {
    renderProtectedRoute();

    expect(screen.getByText("login-from:/admin/orders")).toBeInTheDocument();
    expect(screen.queryByText("orders-page")).not.toBeInTheDocument();
  });

  it("renders nested admin routes for an active session", () => {
    adminSession.session = {
      username: "owner",
      csrf_token: "csrf",
      expires_at: "2026-07-31T00:00:00Z",
    };

    renderProtectedRoute();

    expect(screen.getByText("protected-layout")).toBeInTheDocument();
    expect(screen.getByText("orders-page")).toBeInTheDocument();
  });
});
