import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  authenticateGaragePortal,
  getGarageVehicleContext,
  storeGarageToken,
  storeGarageVehicleContext,
} from "../lib/api";

function readVehicleContext(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("vehicle") ?? getGarageVehicleContext();
}

export default function PortalAuth() {
  const rootRef = useRef<HTMLElement>(null);
  const [pin, setPin] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(() => readVehicleContext());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextVehicle = params.get("vehicle");
    if (nextVehicle) {
      storeGarageVehicleContext(nextVehicle);
      setVehicleId(nextVehicle);
    }
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".portal-reveal",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power4.out", stagger: 0.08 },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setSubmitting(true);
    setError(null);
    try {
      const response = await authenticateGaragePortal(pin, vehicleId);
      storeGarageToken(response.access_token);
      storeGarageVehicleContext(String(response.vehicle_id));
      window.history.pushState({}, "", "/portal/garage");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      setError("PIN invalido o acceso revocado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      ref={rootRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 text-[#f2f2f2]"
    >
      <div className="precision-grid opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.1),transparent_26rem)]"
        aria-hidden="true"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[420px] text-center"
      >
        <div className="portal-reveal mx-auto mb-8 flex h-16 w-16 items-center justify-center border border-white/10 bg-[#0a0a0a] text-[#d8d8d8]">
          <LockKeyhole size={22} strokeWidth={1.45} />
        </div>
        <p className="portal-reveal mb-4 text-[10px] font-medium uppercase tracking-[0.32em] text-[#707070]">
          7F Digital Garage
        </p>
        <h1 className="portal-reveal mb-10 text-[clamp(2.9rem,11vw,6rem)] font-light leading-none tracking-[-0.07em]">
          Portal
        </h1>

        <input
          autoFocus
          inputMode="text"
          value={pin}
          onChange={(event) => setPin(event.target.value.toUpperCase())}
          maxLength={12}
          aria-label="PIN de acceso"
          className="portal-reveal focus-ring h-16 w-full border border-white/10 bg-black/40 px-5 text-center text-[22px] font-medium uppercase tracking-[0.42em] text-[#f2f2f2] outline-none transition-colors placeholder:text-[#3a3a3a] hover:border-white/18"
          placeholder="PIN"
        />

        {error ? (
          <p className="portal-reveal mt-5 text-[13px] text-red-300">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={!pin || submitting}
          className="portal-reveal mt-5 inline-flex h-13 w-full items-center justify-center gap-3 bg-[#f2f2f2] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:scale-[0.99] hover:opacity-85 disabled:opacity-45"
        >
          {submitting ? "Validando" : "Acceder"}
          {!submitting ? <ArrowRight size={15} /> : null}
        </button>

        <p className="portal-reveal mt-7 text-[11px] leading-5 text-[#707070]">
          {vehicleId
            ? "Acceso privado vinculado a tu vehiculo."
            : "Ingresa tu PIN para abrir tu expediente privado."}
        </p>
      </form>
    </main>
  );
}
