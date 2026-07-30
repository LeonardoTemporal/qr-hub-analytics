import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminLoginPage from "./AdminLoginPage";

const login = vi.hoisted(() => vi.fn());

vi.mock("../auth/AdminSessionProvider", () => ({
  useAdminSession: () => ({
    session: null,
    loading: false,
    login,
    logout: vi.fn(),
  }),
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue({
      username: "owner",
      csrf_token: "csrf",
      expires_at: "2026-07-31T00:00:00Z",
    });
  });

  it("returns to the protected destination after a successful login", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/admin/login",
            state: { from: "/admin/orders" },
          },
        ]}
      >
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/orders" element={<p>orders-destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "owner" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Acceder" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        username: "owner",
        password: "secure-password",
      });
    });
    expect(await screen.findByText("orders-destination")).toBeInTheDocument();
  });
});
