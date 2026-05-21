import { ArrowRight, Camera, Car, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  fetchGarageShowcase,
  storeGarageVehicleContext,
  type ShowcaseResponse,
} from "../lib/api";

gsap.registerPlugin(ScrollTrigger);

function vehicleTitle(data: ShowcaseResponse | null, slug: string): string {
  if (!data) return slug.replace(/[-_]/g, " ").toUpperCase();
  return `${data.vehicle.brand} ${data.vehicle.model}`;
}

export default function ShowcasePage({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<ShowcaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGarageShowcase(slug)
      .then((next) => {
        if (!cancelled) {
          setData(next);
          storeGarageVehicleContext(slug);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el auto");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!rootRef.current || !data) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(".garage-reveal, .showcase-media", { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".garage-reveal",
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 1, ease: "power4.out", stagger: 0.08 },
      );
      gsap.utils.toArray<HTMLElement>(".showcase-media").forEach((node) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 70, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.15,
            ease: "power4.out",
            scrollTrigger: {
              trigger: node,
              start: "top 84%",
              end: "bottom 62%",
              scrub: 0.8,
            },
          },
        );
      });
    }, rootRef);

    return () => ctx.revert();
  }, [data]);

  const publicMedia = useMemo(
    () =>
      data?.services.flatMap((service) =>
        service.media.map((media) => ({
          ...media,
          serviceType: service.service_type,
        })),
      ) ?? [],
    [data],
  );

  const title = vehicleTitle(data, slug);

  return (
    <main ref={rootRef} className="min-h-screen bg-[#050505] text-[#f2f2f2]">
      <div className="precision-grid opacity-60" aria-hidden="true" />

      <section className="relative flex min-h-screen items-end overflow-hidden px-5 pb-12 pt-24 md:px-10 md:pb-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_28rem),linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <a
              href="/"
              className="garage-reveal mb-9 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070] transition-colors hover:text-[#f2f2f2]"
            >
              <Car size={15} />
              7F Digital Garage
            </a>
            <p className="garage-reveal mb-4 text-[11px] font-medium uppercase tracking-[0.32em] text-[#707070]">
              Showcase publico
            </p>
            <h1 className="garage-reveal max-w-5xl text-[clamp(4rem,15vw,13rem)] font-semibold uppercase leading-[0.78] tracking-[-0.075em]">
              {loading ? "Cargando" : title}
            </h1>
            <div className="garage-reveal mt-8 flex flex-wrap gap-2">
              {(data?.services ?? []).map((service) => (
                <span
                  key={service.service_type}
                  className="border border-white/10 bg-white/[0.035] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#b8b8b8]"
                >
                  {service.service_type}
                </span>
              ))}
            </div>
          </div>

          <aside className="garage-reveal border border-white/10 bg-[#0a0a0a]/80 p-5 backdrop-blur-xl">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#707070]">
              Acceso privado
            </p>
            <p className="text-[15px] leading-7 text-[#a8a8a8]">
              El expediente completo, garantia y recomendaciones tecnicas se consultan
              con el PIN entregado por 7Fitment.
            </p>
            <a
              href={`/portal?vehicle=${encodeURIComponent(slug)}`}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#f2f2f2] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-opacity hover:opacity-85"
            >
              <LockKeyhole size={15} />
              Abrir portal
              <ArrowRight size={15} />
            </a>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
        {error ? (
          <div className="border border-white/10 bg-white/[0.025] p-8 text-center">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.26em] text-[#707070]">
              Auto no disponible
            </p>
            <p className="text-[16px] text-[#b8b8b8]">{error}</p>
          </div>
        ) : null}

        {!error && !loading && !publicMedia.length ? (
          <div className="border border-white/10 bg-white/[0.025] p-8 text-center">
            <Camera className="mx-auto mb-5 text-[#707070]" size={28} strokeWidth={1.5} />
            <p className="text-[15px] text-[#a8a8a8]">
              Galeria en preparacion. El expediente publico estara disponible pronto.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {publicMedia.map((media, index) => (
            <article
              key={`${media.media_url}-${index}`}
              className={`showcase-media group overflow-hidden border border-white/10 bg-[#0a0a0a] ${
                index % 3 === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#111]">
                {media.media_type === "video" ? (
                  <video
                    src={media.media_url}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={media.media_url}
                    alt={media.caption ?? media.serviceType}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
                  {media.serviceType}
                </p>
                <p className="truncate text-[13px] text-[#b8b8b8]">
                  {media.caption ?? "Proceso 7Fitment"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
