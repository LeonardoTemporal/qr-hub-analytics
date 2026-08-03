import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EnlacesPage from "./EnlacesPage";
import { trackQrEvent } from "../lib/api";

vi.mock("../hooks/useLenis", () => ({ useLenis: vi.fn() }));
vi.mock("../lib/api", () => ({
  trackQrEvent: vi.fn().mockResolvedValue(true),
}));
vi.mock("../lib/motion", () => ({
  EASE: { out: "none", text: "none" },
  SplitText: { create: vi.fn() },
  gsap: { set: vi.fn(), context: vi.fn() },
  prefersReducedMotion: () => true,
}));
vi.mock("../components/LocationSoftPrompt", () => ({ default: () => null }));

describe("EnlacesPage", () => {
  beforeEach(() => {
    vi.mocked(trackQrEvent).mockClear();
  });

  afterEach(() => cleanup());

  it("presents the real brand, a primary WhatsApp conversion and curated work", () => {
    render(<EnlacesPage />);

    expect(screen.getByRole("img", { name: "7Fitment" })).toHaveAttribute(
      "src",
      "/assets/7fitment-logo.png",
    );
    expect(
      screen.getByRole("link", { name: /cotizar por whatsapp/i }),
    ).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(
      screen.getByRole("heading", { name: /trabajos que hablan/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("enlaces-work-preview")).toHaveLength(3);
  });

  it("keeps WhatsApp and secondary destinations attributed to the QR session", () => {
    render(<EnlacesPage />);

    fireEvent.click(screen.getByRole("link", { name: "Cotizar por WhatsApp" }));
    fireEvent.click(
      screen.getByRole("link", { name: "Trabajos recientesInstagram" }),
    );
    fireEvent.click(
      screen.getByRole("link", { name: "Ver trabajos de 7Fitment en Instagram" }),
    );
    fireEvent.click(
      screen.getByRole("link", { name: "Satélite, Edo. Méx.Ubicación" }),
    );

    expect(trackQrEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "destination_view" }),
    );
    expect(trackQrEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "cta_click", element_id: "quote-project" }),
    );
    expect(trackQrEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "cta_click", element_id: "instagram" }),
    );
    expect(trackQrEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "cta_click", element_id: "location" }),
    );
    expect(
      vi.mocked(trackQrEvent).mock.calls.filter(
        ([event]) => event.event_type === "cta_click" && event.element_id === "instagram",
      ),
    ).toHaveLength(2);
  });
});
