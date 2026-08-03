import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { gsap, SplitText, EASE, prefersReducedMotion } from "../lib/motion";
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
  const inputWrapRef = useRef<HTMLDivElement>(null);
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
    if (prefersReducedMotion()) {
      gsap.set([".portal-reveal", ".portal-title"], { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.set(".portal-title", { opacity: 0 });
      gsap.fromTo(
        ".portal-reveal",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: EASE.text, stagger: 0.08 },
      );
      const titleEl = rootRef.current?.querySelector<HTMLElement>(".portal-title");
      if (titleEl) {
        document.fonts.ready.then(() => {
          if (!titleEl.isConnected) return;
          SplitText.create(titleEl, {
            type: "chars",
            mask: "chars",
            autoSplit: true,
            onSplit(self) {
              gsap.set(titleEl, { opacity: 1 });
              return gsap.from(self.chars, {
                yPercent: 115,
                duration: 1,
                stagger: 0.05,
                delay: 0.15,
                ease: EASE.text,
              });
            },
          });
        });
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!error || prefersReducedMotion() || !inputWrapRef.current) return;
    gsap.fromTo(
      inputWrapRef.current,
      { x: -5 },
      { x: 0, duration: 0.4, ease: "elastic.out(1.1, 0.35)" },
    );
  }, [error]);

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
        className="relative z-10 w-full max-w-[440px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-md sm:px-10 sm:py-12"
      >
        <div className="portal-reveal mx-auto mb-9 flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-[#d8d8d8]">
          <LockKeyhole size={22} strokeWidth={1.45} />
        </div>
        <p className="portal-reveal mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#787878]">
          Access / PIN — 7F Garage
        </p>
        <h1 className="portal-title mb-11 text-[clamp(2.9rem,11vw,6rem)] font-light leading-none tracking-[-0.07em]">
          Portal
        </h1>

        <div ref={inputWrapRef} className="portal-reveal relative">
          <input
            autoFocus
            inputMode="text"
            value={pin}
            onChange={(event) => setPin(event.target.value.toUpperCase())}
            maxLength={12}
            aria-label="PIN de acceso"
            className="focus-ring h-16 w-full rounded-lg border border-white/10 bg-black/50 px-5 text-center text-[22px] font-medium uppercase tracking-[0.42em] text-[#f2f2f2] outline-none transition-colors duration-300 placeholder:text-[#3a3a3a] hover:border-white/25 focus:border-white/30"
            placeholder="PIN"
          />
          {submitting ? <span className="scan-underline" aria-hidden="true" /> : null}
        </div>

        {error ? (
          <p className="portal-reveal mt-5 text-[13px] text-red-300">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={!pin || submitting}
          className="portal-reveal mt-6 inline-flex h-13 w-full items-center justify-center gap-3 rounded-lg bg-[#f2f2f2] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-white disabled:opacity-45"
        >
          {submitting ? "Validando" : "Acceder"}
          {!submitting ? <ArrowRight size={15} /> : null}
        </button>

        <p className="portal-reveal mt-8 text-[11px] leading-5 text-[#787878]">
          {vehicleId
            ? "Acceso privado vinculado a tu vehiculo."
            : "Ingresa tu PIN para abrir tu expediente privado."}
        </p>
      </form>
    </main>
  );
}
