import { MapPin, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { submitBrowserLocation } from "../lib/api";

const STORAGE_KEY = "location_permission_preference_v2";
const PREFERENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

interface StoredPreference {
  decision: "granted" | "denied";
  expiresAt: number;
}

function readQrMarker(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("qr") === "1";
}

function clearQrMarker(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("qr")) return;
  url.searchParams.delete("qr");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function getStoredPreference(): "granted" | "denied" | null {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as StoredPreference | null;
    if (!stored || stored.expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.decision;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function storePreference(decision: "granted" | "denied"): void {
  const preference: StoredPreference = {
    decision,
    expiresAt: Date.now() + PREFERENCE_TTL_MS,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
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
  const isQrVisit = useMemo(readQrMarker, []);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const finish = useCallback(() => {
    clearQrMarker();
    setVisible(false);
  }, []);

  const submitPreciseLocation = useCallback(async () => {
    if (!isQrVisit || !("geolocation" in navigator)) {
      finish();
      return;
    }

    setSubmitting(true);
    try {
      const position = await getCurrentPosition();
      const latitude = Math.round(position.coords.latitude * 1000) / 1000;
      const longitude = Math.round(position.coords.longitude * 1000) / 1000;
      const location = await reverseGeocode(
        latitude,
        longitude,
      );
      const payload = {
        ...location,
        latitude,
        longitude,
        accuracy_meters: Math.max(
          100,
          Math.round(position.coords.accuracy || 100),
        ),
      };
      let updated = false;
      for (let attempt = 0; attempt < 4 && !updated; attempt += 1) {
        updated = await submitBrowserLocation(payload);
        if (!updated) {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      }
      if (!updated) throw new Error("La sesion QR aun no esta disponible");
      storePreference("granted");
    } catch {
      storePreference("denied");
    } finally {
      setSubmitting(false);
      finish();
    }
  }, [finish, isQrVisit]);

  useEffect(() => {
    if (!isQrVisit) return;

    const preference = getStoredPreference();
    if (preference === "granted") {
      void submitPreciseLocation();
      return;
    }
    if (preference === "denied") {
      clearQrMarker();
      return;
    }
    if (!("geolocation" in navigator)) {
      storePreference("denied");
      clearQrMarker();
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [isQrVisit, submitPreciseLocation]);

  const decline = () => {
    storePreference("denied");
    finish();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-5 backdrop-blur-[2px] sm:items-center sm:pb-0">
      <section className="soft-prompt-in relative w-full max-w-[460px] overflow-hidden border border-white/10 bg-[#080808]/95 p-5 text-[#f2f2f2] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-6">
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
          <div className="relative mb-5 flex h-11 w-11 items-center justify-center border border-white/10 bg-[#050505] text-[#d8d8d8]">
            <MapPin size={18} strokeWidth={1.5} />
            <span className="absolute -left-px -top-px h-2.5 w-2.5 border-l border-t border-white/40" aria-hidden="true" />
            <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-white/40" aria-hidden="true" />
          </div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#707070]">
            Experiencia personalizada
          </p>
          <h2 className="max-w-[360px] text-[26px] font-medium leading-[0.98] tracking-[-0.055em]">
            Servicios cerca de tu zona.
          </h2>
          <p className="mt-4 text-[14px] leading-6 text-[#9a9a9a]">
            Si aceptas, tu navegador compartirá una ubicación aproximada con
            7Fitment y OpenStreetMap para identificar tu zona y personalizar la
            disponibilidad en CDMX/EdoMex. La preferencia vence en 30 días.
          </p>

          <div className="mt-6 h-px w-full bg-white/10" aria-hidden="true" />

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
