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

    const timer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(timer);
  }, [isQrVisit, submitPreciseLocation]);

  const decline = () => {
    storePreference("denied");
    finish();
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:p-5">
      <aside
        aria-labelledby="location-prompt-title"
        className="soft-prompt-in pointer-events-auto relative w-full max-w-[430px] overflow-hidden border border-white/[0.12] bg-[#080808] p-4 text-[#f2f2f2] shadow-[0_18px_60px_rgba(0,0,0,0.72)]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_42%)]"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={decline}
          className="focus-ring absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center text-[#666] transition-colors hover:text-[#f2f2f2]"
          aria-label="Cerrar y continuar con ubicación aproximada"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-white/[0.1] bg-[#050505] text-[#aaa]">
              <MapPin size={15} strokeWidth={1.5} />
              <span className="absolute -left-px -top-px h-2 w-2 border-l border-t border-white/40" aria-hidden="true" />
              <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-white/40" aria-hidden="true" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#929292]">
              Ubicación opcional
            </p>
          </div>
          <h2
            id="location-prompt-title"
            className="mt-3 max-w-[310px] pr-5 text-[17px] font-medium leading-tight tracking-[-0.035em] sm:text-[18px]"
          >
            ¿Nos ayudas a ubicar este escaneo?
          </h2>
          <p className="mt-2 max-w-[380px] text-[12px] leading-[1.6] text-[#a3a3a3]">
            Compartir tu zona nos ayuda a entender hasta dónde llegan nuestros
            proyectos y mejorar la atención en tu área. Es opcional y usamos
            coordenadas reducidas para identificar únicamente una zona aproximada.
          </p>
          <p className="mt-1.5 max-w-[380px] font-mono text-[9px] leading-[1.55] tracking-[0.06em] text-[#8f8f8f]">
            Al permitir, OpenStreetMap traduce la zona y recordamos tu decisión durante 30 días. Nunca registramos tu recorrido.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={decline}
              disabled={submitting}
              className="focus-ring min-h-11 px-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#777] transition-colors hover:text-[#f2f2f2] disabled:opacity-50"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={() => void submitPreciseLocation()}
              disabled={submitting}
              className="focus-ring min-h-11 border border-white/[0.14] bg-white/[0.035] px-4 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#d5d5d5] transition-colors hover:border-white/30 hover:bg-white/[0.07] disabled:opacity-50"
            >
              {submitting ? "Consultando zona" : "Compartir mi zona"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
