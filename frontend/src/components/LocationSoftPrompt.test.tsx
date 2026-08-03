import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocationSoftPrompt from "./LocationSoftPrompt";
import { submitBrowserLocation } from "../lib/api";

vi.mock("../lib/api", () => ({ submitBrowserLocation: vi.fn() }));

describe("LocationSoftPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/enlaces?qr=1");
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("offers a non-blocking choice and keeps approximate location on decline", async () => {
    render(<LocationSoftPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(
      screen.getByRole("heading", { name: /nos ayudas a ubicar este escaneo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/zona aproximada/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap/i)).toBeInTheDocument();
    expect(screen.getByText(/30 días/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ahora no/i }));

    expect(submitBrowserLocation).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    expect(screen.queryByText(/nos ayudas a ubicar este escaneo/i)).not.toBeInTheDocument();
  });

  it("submits a minimized precise zone after explicit consent", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 42,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 19.432608,
          longitude: -99.133209,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { country: "México", state: "Ciudad de México", city: "Cuauhtémoc" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.mocked(submitBrowserLocation).mockResolvedValue(true);

    render(<LocationSoftPrompt />);
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Compartir mi zona" }));

    await waitFor(() => {
      expect(submitBrowserLocation).toHaveBeenCalledWith({
        country: "México",
        state: "Ciudad de México",
        city: "Cuauhtémoc",
        latitude: 19.433,
        longitude: -99.133,
        accuracy_meters: 100,
      });
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
  });

  it("honors a recent decline without showing the prompt again", async () => {
    window.localStorage.setItem(
      "location_permission_preference_v2",
      JSON.stringify({ decision: "denied", expiresAt: Date.now() + 60_000 }),
    );

    render(<LocationSoftPrompt />);
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.queryByText(/nos ayudas a ubicar este escaneo/i)).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(submitBrowserLocation).not.toHaveBeenCalled();
  });
});
