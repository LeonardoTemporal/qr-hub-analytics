import { MapPin, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { submitBrowserLocation } from "../lib/api";

const STORAGE_KEY = "location_permission_granted";

interface ReverseGeocodeAddress {
  country?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  suburb?: string;
  city_district?: string;
}

interface ReverseGeocodeResponse {
  address?: ReverseGeocodeAddress;
}

function readScanToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("scan");
}

function clearScanToken(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("scan")) return;
  url.searchParams.delete("scan");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function getStoredPreference(): "granted" | "denied" | null {
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "true") return "granted";
  if (value === "false") return "denied";
  return null;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 1000 * 60 * 10,
      timeout: 8000,
    });
  });
}

async function reverseGeocode(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    addressdetails: "1",
    "accept-language": "es-MX,es;q=0.9,en;q=0.6",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
  );
  if (!response.ok) throw new Error("No se pudo resolver la ubicacion");

  const payload = (await response.json()) as ReverseGeocodeResponse;
  const address = payload.address ?? {};
  return {
    country: address.country,
    state: address.state,
    city:
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.county ??
      address.city_district ??
      address.suburb,
  };
}

export default function LocationSoftPrompt() {
  const scanToken = useMemo(readScanToken, []);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const finish = useCallback(() => {
    clearScanToken();
    setVisible(false);
  }, []);

  const submitPreciseLocation = useCallback(async () => {
    if (!scanToken || !("geolocation" in navigator)) {
      finish();
      return;
    }

    setSubmitting(true);
    try {
      const position = await getCurrentPosition();
      const location = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );
      await submitBrowserLocation({
        scan_token: scanToken,
        ...location,
      });
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      window.localStorage.setItem(STORAGE_KEY, "false");
    } finally {
      setSubmitting(false);
      finish();
    }
  }, [finish, scanToken]);

  useEffect(() => {
    if (!scanToken) return;

    const preference = getStoredPreference();
    if (preference === "granted") {
      void submitPreciseLocation();
      return;
    }
    if (preference === "denied") {
      clearScanToken();
      return;
    }
    if (!("geolocation" in navigator)) {
      window.localStorage.setItem(STORAGE_KEY, "false");
      clearScanToken();
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [scanToken, submitPreciseLocation]);

  const decline = () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    finish();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-5 backdrop-blur-[2px] sm:items-center sm:pb-0">
      <section className="relative w-full max-w-[460px] overflow-hidden border border-white/10 bg-[#080808]/95 p-5 text-[#f2f2f2] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.08),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.045),transparent_44%)]"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={decline}
          className="focus-ring absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center border border-white/10 bg-black/30 text-[#707070] transition-colors hover:text-[#f2f2f2]"
          aria-label="Cerrar"
        >
          <X size={15} strokeWidth={1.5} />
        </button>

        <div className="relative z-10">
          <div className="mb-5 flex h-11 w-11 items-center justify-center border border-white/10 bg-[#050505] text-[#d8d8d8]">
            <MapPin size={18} strokeWidth={1.5} />
          </div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070]">
            Experiencia personalizada
          </p>
          <h2 className="max-w-[360px] text-[26px] font-medium leading-[0.98] tracking-[-0.055em]">
            Servicios cerca de tu zona.
          </h2>
          <p className="mt-4 text-[14px] leading-6 text-[#9a9a9a]">
            Para ofrecerte una experiencia personalizada y mostrarte la disponibilidad
            de servicios en CDMX/EdoMex, necesitamos conocer tu ubicación.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_1.25fr]">
            <button
              type="button"
              onClick={decline}
              disabled={submitting}
              className="focus-ring min-h-12 border border-white/10 px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a] transition-colors hover:border-white/18 hover:text-[#f2f2f2] disabled:opacity-50"
            >
              Continuar sin personalizar
            </button>
            <button
              type="button"
              onClick={() => void submitPreciseLocation()}
              disabled={submitting}
              className="focus-ring min-h-12 bg-[#f2f2f2] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-opacity disabled:opacity-60"
            >
              {submitting ? "Ubicando" : "Permitir"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
