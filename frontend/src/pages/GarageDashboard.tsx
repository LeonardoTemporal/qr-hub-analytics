import {
  ArrowLeft,
  CalendarDays,
  Car,
  LogOut,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  clearGarageSession,
  fetchGaragePortalData,
  getGarageToken,
  type PortalDataResponse,
  type PortalServiceRecord,
} from "../lib/api";

function formatDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function warrantyProgress(service: PortalServiceRecord): number {
  if (!service.warranty_expires_at) return 100;
  const start = new Date(`${service.installed_at}T00:00:00`).getTime();
  const end = new Date(`${service.warranty_expires_at}T00:00:00`).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
}

function ServiceCard({ service }: { service: PortalServiceRecord }) {
  const progress = warrantyProgress(service);

  return (
    <article className="garage-card border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
            {service.service_type}
          </p>
          <h3 className="text-[24px] font-medium leading-none tracking-[-0.055em]">
            {service.title ?? "Servicio 7Fitment"}
          </h3>
        </div>
        <ShieldCheck className="text-[#d8d8d8]" size={22} strokeWidth={1.4} />
      </div>

      <div className="grid gap-3 text-[13px] text-[#a8a8a8] sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={14} />
          Instalacion: {formatDate(service.installed_at)}
        </span>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={14} />
          Garantia: {formatDate(service.warranty_expires_at)}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#707070]">
          <span>Vigencia restante</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-[3px] overflow-hidden bg-white/[0.08]">
          <div
            className="warranty-bar h-full origin-left bg-[#f2f2f2]"
            data-progress={progress / 100}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="border border-white/[0.07] bg-black/20 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#707070]">
            <Sparkles size={14} />
            Lavado
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">
            {service.washing_recommendations ?? "Recomendaciones pendientes por cargar."}
          </p>
        </div>
        <div className="border border-white/[0.07] bg-black/20 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#707070]">
            <Wrench size={14} />
            Cuidado tecnico
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">
            {service.care_instructions ?? "Instrucciones pendientes por cargar."}
          </p>
        </div>
      </div>

      {service.internal_notes ? (
        <div className="mt-4 border border-white/[0.07] bg-black/20 p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#707070]">
            Notas internas
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">{service.internal_notes}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function GarageDashboard() {
  const rootRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<PortalDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getGarageToken();
    if (!token) {
      window.history.replaceState({}, "", "/portal");
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    let cancelled = false;
    fetchGaragePortalData(token)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        clearGarageSession();
        if (!cancelled) setError("Tu sesion expiro. Vuelve a ingresar tu PIN.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current || !data) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".garage-card",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.85, ease: "power4.out", stagger: 0.07 },
      );
      gsap.fromTo(
        ".warranty-bar",
        { scaleX: 0 },
        {
          scaleX: (_index, node) =>
            Number((node as HTMLElement).dataset.progress ?? 1),
          duration: 1.2,
          ease: "power4.out",
          stagger: 0.08,
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, [data]);

  const vehicleName = useMemo(
    () => (data ? `${data.vehicle.brand} ${data.vehicle.model}` : "7F Garage"),
    [data],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-[#707070]">
        <p className="text-[11px] font-medium uppercase tracking-[0.26em]">
          Cargando expediente
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-[#f2f2f2]">
        <section className="max-w-[440px] border border-white/10 bg-white/[0.035] p-7 text-center">
          <p className="mb-5 text-[14px] text-[#b8b8b8]">{error ?? "Sin datos disponibles."}</p>
          <a
            href="/portal"
            className="inline-flex h-12 items-center justify-center bg-[#f2f2f2] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black"
          >
            Volver al portal
          </a>
        </section>
      </main>
    );
  }

  return (
    <main ref={rootRef} className="dashboard-grid min-h-screen bg-[#050505] text-[#f2f2f2]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/65 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#707070] hover:text-[#f2f2f2]">
            <ArrowLeft size={15} />
            Inicio
          </a>
          <button
            type="button"
            onClick={() => {
              clearGarageSession();
              window.history.replaceState({}, "", "/portal");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a] hover:text-[#f2f2f2]"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <section className="garage-card mb-7 grid gap-8 border border-white/10 bg-white/[0.035] p-6 md:grid-cols-[1fr_0.9fr] md:p-8">
          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070]">
              Expediente privado
            </p>
            <h1 className="text-[clamp(3rem,8vw,7rem)] font-light leading-[0.85] tracking-[-0.075em]">
              {vehicleName}
            </h1>
          </div>
          <div className="grid gap-3 text-[13px] text-[#a8a8a8] sm:grid-cols-2">
            <span className="border border-white/[0.07] bg-black/20 p-4">
              Cliente<br />
              <strong className="text-[#f2f2f2]">{data.client.full_name}</strong>
            </span>
            <span className="border border-white/[0.07] bg-black/20 p-4">
              VIN<br />
              <strong className="text-[#f2f2f2]">{data.vehicle.vin ?? "No registrado"}</strong>
            </span>
            <span className="border border-white/[0.07] bg-black/20 p-4">
              Placas<br />
              <strong className="text-[#f2f2f2]">{data.vehicle.plate ?? "No registradas"}</strong>
            </span>
            <span className="border border-white/[0.07] bg-black/20 p-4">
              Color<br />
              <strong className="text-[#f2f2f2]">{data.vehicle.color ?? "No registrado"}</strong>
            </span>
          </div>
        </section>

        <div className="grid gap-5">
          {data.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {!data.services.length ? (
          <section className="garage-card border border-white/10 bg-white/[0.035] p-8 text-center">
            <Car className="mx-auto mb-4 text-[#707070]" size={28} strokeWidth={1.5} />
            <p className="text-[14px] text-[#a8a8a8]">
              Aun no hay servicios cargados para este vehiculo.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
