import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./features/admin/auth/RequireAdmin", () => ({
  default: () => <Outlet />,
}));

vi.mock("./features/admin/layout/AdminLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("./pages/DashboardPage", () => ({
  default: function DashboardRouteProbe() {
    const location = useLocation();
    return <p>analytics-route:{location.pathname}</p>;
  },
}));

describe("application routes", () => {
  it("keeps the legacy dashboard route pointing to admin analytics", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("analytics-route:/admin/analytics"),
    ).toBeInTheDocument();
  });
});
