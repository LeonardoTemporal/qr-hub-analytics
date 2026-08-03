import {
  ArrowLeft,
  CalendarDays,
  Car,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText, EASE, prefersReducedMotion } from "../lib/motion";
import { useLenis } from "../hooks/useLenis";
import {
  clearGarageSession,
  createGarageWarrantyClaim,
  fetchGaragePortalData,
  getGarageToken,
  type PortalDataResponse,
  type PortalServiceRecord,
  type PortalWarrantyClaim,
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
    <article className="garage-card rounded-xl border border-white/[0.09] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#787878]">
            {service.service_type}
          </p>
          <h3 className="text-[24px] font-medium leading-none tracking-[-0.055em]">
            {service.title ?? "Servicio 7Fitment"}
          </h3>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/[0.1] bg-white/[0.04] text-[#d8d8d8]">
          <ShieldCheck size={20} strokeWidth={1.4} />
        </span>
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

      <div className="mt-7">
        <div className="mb-2.5 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#787878]">
          <span>Vigencia restante</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="warranty-bar h-full origin-left rounded-full bg-[#f2f2f2]"
            data-progress={progress / 100}
          />
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#787878]">
            <Sparkles size={14} />
            Lavado
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">
            {service.washing_recommendations ?? "Recomendaciones pendientes por cargar."}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#787878]">
            <Wrench size={14} />
            Cuidado tecnico
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">
            {service.care_instructions ?? "Instrucciones pendientes por cargar."}
          </p>
        </div>
      </div>

      {service.internal_notes ? (
        <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/30 p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#787878]">
            Notas internas
          </p>
          <p className="text-[13px] leading-6 text-[#b8b8b8]">{service.internal_notes}</p>
        </div>
      ) : null}

      {service.media.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {service.media.map((media) => (
            <figure key={media.id} className="aspect-[4/3] overflow-hidden rounded-md border border-white/[0.07] bg-black/35">
              {media.media_type === "video" ? (
                <video src={media.media_url} className="h-full w-full object-cover" controls preload="metadata" playsInline />
              ) : (
                <img src={media.media_url} alt={media.caption ?? service.title ?? service.service_type} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              )}
            </figure>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ClaimRequestPanel({
  warranties,
  onCreated,
}: {
  warranties: PortalDataResponse["warranties"];
  onCreated: (claim: PortalWarrantyClaim) => void;
}) {
  const eligible = warranties.filter((policy) =>
    ["active", "expired"].includes(policy.status),
  );
  const [open, setOpen] = useState(false);
  const [policyId, setPolicyId] = useState(() => String(eligible[0]?.id ?? ""));
  const [incidentAt, setIncidentAt] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!eligible.length) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getGarageToken();
    if (!token) {
      setFeedback("Tu sesion expiro. Vuelve a ingresar al portal.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const claim = await createGarageWarrantyClaim(token, {
        warranty_policy_id: Number(policyId),
        description: description.trim(),
        ...(incidentAt ? { incident_at: incidentAt } : {}),
      });
      onCreated(claim);
      setDescription("");
      setIncidentAt("");
      setOpen(false);
      setFeedback(`Solicitud ${claim.claim_number} recibida.`);
    } catch (claimError) {
      setFeedback(
        claimError instanceof Error
          ? claimError.message
          : "No pudimos registrar la solicitud. Intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="garage-card mb-6 rounded-xl border border-white/[0.09] bg-white/[0.03] backdrop-blur-sm">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex max-w-2xl items-start gap-4">
          <ShieldAlert className="mt-1 shrink-0 text-[#d8d8d8]" size={20} strokeWidth={1.4} />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#626262]">
              Asistencia de postventa
            </p>
            <h2 className="mt-2 text-[20px] font-medium tracking-[-0.04em]">
              Solicitar una revision tecnica
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[#858585]">
              Describe la incidencia y nuestro equipo la vinculara con la poliza de este vehiculo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setOpen((current) => !current);
          }}
          aria-expanded={open}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8d8d8] transition-colors duration-300 hover:bg-white hover:text-black"
        >
          {open ? <X size={14} /> : <ShieldAlert size={14} />}
          {open ? "Cerrar" : "Reportar incidencia"}
        </button>
      </div>

      {open ? (
        <form onSubmit={submit} className="grid gap-4 border-t border-white/[0.07] p-6 md:grid-cols-2 sm:p-7">
          <label className="grid gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070]">
            Poliza
            <select
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              required
              className="h-12 rounded-lg border border-white/10 bg-[#080808] px-3 font-sans text-[13px] normal-case tracking-normal text-[#f2f2f2] outline-none transition-colors duration-300 focus:border-white/30"
            >
              {eligible.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policy_number}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070]">
            Fecha de la incidencia
            <input
              type="date"
              value={incidentAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setIncidentAt(event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-[#080808] px-3 font-sans text-[13px] normal-case tracking-normal text-[#f2f2f2] outline-none transition-colors duration-300 focus:border-white/30"
            />
          </label>
          <label className="grid gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#707070] md:col-span-2">
            Que sucedio
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              minLength={20}
              maxLength={2000}
              required
              rows={4}
              placeholder="Describe la zona afectada, cuando lo notaste y cualquier detalle visible."
              className="resize-y rounded-lg border border-white/10 bg-[#080808] p-3 font-sans text-[13px] normal-case leading-6 tracking-normal text-[#f2f2f2] outline-none transition-colors duration-300 placeholder:text-[#505050] focus:border-white/30"
            />
          </label>
          <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-[11px] text-[#8a8a8a]">
              {feedback ?? "Recibiras seguimiento dentro de este mismo expediente."}
            </p>
            <button
              type="submit"
              disabled={submitting || description.trim().length < 20}
              className="h-12 rounded-lg bg-[#f2f2f2] px-6 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-black transition-colors duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {submitting ? "Enviando" : "Enviar a revision"}
            </button>
          </div>
        </form>
      ) : feedback ? (
        <p aria-live="polite" className="border-t border-white/[0.07] px-5 py-4 text-[11px] text-[#a8a8a8]">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

export default function GarageDashboard() {
  const rootRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<PortalDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useLenis();

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

  const animationVehicleId = data?.vehicle.id;

  useEffect(() => {
    if (!rootRef.current || !animationVehicleId) return;
    if (prefersReducedMotion()) {
      gsap.set(".garage-card, .garage-title", { opacity: 1, y: 0 });
      gsap.utils.toArray<HTMLElement>(".warranty-bar").forEach((bar) => {
        gsap.set(bar, { scaleX: Number(bar.dataset.progress ?? 1) });
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(".garage-card", { opacity: 0, y: 28 });
      ScrollTrigger.batch(".garage-card", {
        start: "top 90%",
        once: true,
        onEnter: (b) =>
          gsap.to(b, { opacity: 1, y: 0, duration: 0.85, ease: EASE.out, stagger: 0.07 }),
      });

      gsap.utils.toArray<HTMLElement>(".warranty-bar").forEach((bar) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: Number(bar.dataset.progress ?? 1),
            duration: 1.2,
            ease: EASE.text,
            scrollTrigger: { trigger: bar, start: "top 92%", once: true },
          },
        );
      });

      const titleEl = rootRef.current?.querySelector<HTMLElement>(".garage-title");
      if (titleEl) {
        document.fonts.ready.then(() => {
          if (!titleEl.isConnected) return;
          SplitText.create(titleEl, {
            type: "words",
            mask: "words",
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.words, {
                yPercent: 115,
                duration: 1,
                stagger: 0.08,
                ease: EASE.text,
              });
            },
          });
        });
      }

      const imgs = rootRef.current?.querySelectorAll("img");
      if (!imgs || imgs.length === 0) ScrollTrigger.refresh();
    }, rootRef);
    return () => ctx.revert();
  }, [animationVehicleId]);

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
        <section className="max-w-[440px] rounded-xl border border-white/[0.09] bg-white/[0.03] p-8 text-center backdrop-blur-sm">
          <p className="mb-6 text-[14px] text-[#b8b8b8]">{error ?? "Sin datos disponibles."}</p>
          <a
            href="/portal"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[#f2f2f2] px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-colors duration-300 hover:bg-white"
          >
            Volver al portal
          </a>
        </section>
      </main>
    );
  }

  return (
    <main ref={rootRef} className="dashboard-grid min-h-screen bg-[#050505] text-[#f2f2f2]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl md:bg-black/65">
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
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a] transition-colors duration-300 hover:border-white/25 hover:text-[#f2f2f2]"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <section className="garage-card mb-8 grid gap-9 rounded-xl border border-white/[0.09] bg-white/[0.03] p-7 backdrop-blur-sm md:grid-cols-[1fr_0.9fr] md:p-9">
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#787878]">
              Expediente privado
            </p>
            <h1 className="garage-title text-[clamp(3rem,8vw,7rem)] font-light leading-[0.85] tracking-[-0.075em]">
              {vehicleName}
            </h1>
          </div>
          <div className="grid content-start gap-3.5 text-[13px] text-[#a8a8a8] sm:grid-cols-2">
            <span className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#787878]">Cliente</span><br />
              <strong className="text-[#f2f2f2]">{data.client.full_name}</strong>
            </span>
            <span className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#787878]">VIN</span><br />
              <strong className="text-[#f2f2f2]">{data.vehicle.vin ?? "No registrado"}</strong>
            </span>
            <span className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#787878]">Placas</span><br />
              <strong className="text-[#f2f2f2]">{data.vehicle.plate ?? "No registradas"}</strong>
            </span>
            <span className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#787878]">Color</span><br />
              <strong className="text-[#f2f2f2]">{data.vehicle.color ?? "No registrado"}</strong>
            </span>
          </div>
        </section>

        {data.warranties.length ? (
          <section className="mb-6 grid gap-4 md:grid-cols-2">
            {data.warranties.map((policy) => (
              <article key={policy.id} className="garage-card rounded-xl border border-white/[0.09] bg-white/[0.03] p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6c6c6c]">Poliza / {policy.policy_number}</p>
                    <h2 className="mt-2.5 text-[20px] font-medium tracking-[-0.04em]">Cobertura 7Fitment</h2>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/[0.1] bg-white/[0.04] text-[#d8d8d8]">
                    <ShieldCheck size={18} strokeWidth={1.4} />
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 text-[12px] text-[#8a8a8a]">
                  <p><span className="admin-label">Vigente desde</span>{formatDate(policy.effective_date)}</p>
                  <p><span className="admin-label">Expira</span>{formatDate(policy.expiration_date)}</p>
                </div>
                <span className="mt-5 inline-flex rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#b8b8b8]">{policy.status}</span>
              </article>
            ))}
          </section>
        ) : null}

        <ClaimRequestPanel
          warranties={data.warranties}
          onCreated={(claim) =>
            setData((current) =>
              current
                ? { ...current, warranty_claims: [claim, ...current.warranty_claims] }
                : current,
            )
          }
        />

        {data.warranty_claims.length ? (
          <section className="mb-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#626262]">Postventa</p><h2 className="mt-1 text-[22px] font-medium tracking-[-0.04em]">Seguimiento de reclamaciones</h2></div>
              <span className="font-mono text-[9px] text-[#626262]">{data.warranty_claims.length} TOTAL</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.warranty_claims.map((claim) => (
                <article key={claim.id} className="garage-card rounded-xl border border-white/[0.09] bg-white/[0.03] p-6 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6c6c6c]">{claim.claim_number}</p><p className="mt-3 text-[13px] leading-6 text-[#b8b8b8]">{claim.description}</p></div><span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#9a9a9a]">{claim.status}</span></div>
                  {claim.resolution_notes ? <p className="mt-4 border-t border-white/[0.06] pt-4 text-[12px] leading-5 text-[#8a8a8a]">{claim.resolution_notes}</p> : null}
                  {claim.evidence.length ? <div className="mt-4 grid grid-cols-3 gap-2.5">{claim.evidence.map((item) => item.media_type === "image" ? <img key={item.media_asset_id} src={item.media_url} alt={item.original_filename} loading="lazy" decoding="async" className="aspect-square w-full rounded-md border border-white/[0.07] object-cover" /> : <a key={item.media_asset_id} href={item.media_url} target="_blank" rel="noreferrer" className="grid aspect-square place-items-center rounded-md border border-white/[0.08] px-2 text-center font-mono text-[8px] uppercase text-[#707070] transition-colors duration-300 hover:border-white/25 hover:text-white">Ver archivo</a>)}</div> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-5">
          {data.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {!data.services.length ? (
          <section className="garage-card rounded-xl border border-white/[0.09] bg-white/[0.03] p-10 text-center backdrop-blur-sm">
            <Car className="mx-auto mb-4 text-[#787878]" size={28} strokeWidth={1.5} />
            <p className="text-[14px] text-[#a8a8a8]">
              Aun no hay servicios cargados para este vehiculo.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
