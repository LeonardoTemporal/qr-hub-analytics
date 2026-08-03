import { ArrowRight, Camera, Car, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  fetchGarageShowcase,
  storeGarageVehicleContext,
  trackQrEvent,
  type ShowcaseResponse,
} from "../lib/api";
import { gsap, ScrollTrigger, SplitText, EASE, prefersReducedMotion } from "../lib/motion";
import { useLenis } from "../hooks/useLenis";
import MediaLightbox, { type LightboxItem } from "../components/MediaLightbox";

function vehicleTitle(data: ShowcaseResponse | null, slug: string): string {
  if (!data) return slug.replace(/[-_]/g, " ").toUpperCase();
  return `${data.vehicle.brand} ${data.vehicle.model}`;
}

interface ActiveLightbox {
  item: LightboxItem;
  sourceRect: DOMRect;
}

export default function ShowcasePage({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<ShowcaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ActiveLightbox | null>(null);
  const lenisRef = useLenis();

  useEffect(() => {
    void trackQrEvent({
      event_type: "destination_view",
      path: `/auto/${slug}`,
    });
  }, [slug]);

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
    if (prefersReducedMotion()) {
      gsap.set(".garage-reveal, .showcase-media", { opacity: 1, y: 0, clearProps: "clipPath" });
      gsap.set(".hero-hud-frame", { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // hero entrance
      gsap.fromTo(
        ".garage-reveal",
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 1, ease: EASE.text, stagger: 0.08 },
      );
      gsap.to(".hero-hud-frame", { opacity: 1, duration: 1.2, delay: 0.5, ease: "power2.out" });

      // hero title char rise (after fonts settle)
      const titleEl = rootRef.current?.querySelector<HTMLElement>(".showcase-title");
      if (titleEl) {
        document.fonts.ready.then(() => {
          if (!titleEl.isConnected) return;
          SplitText.create(titleEl, {
            type: "chars",
            mask: "chars",
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.chars, {
                yPercent: 115,
                duration: 1.1,
                stagger: 0.03,
                ease: EASE.text,
              });
            },
          });
        });
      }

      // hero content drifts away on scroll
      const heroSection = rootRef.current?.querySelector<HTMLElement>(".showcase-hero");
      const heroContent = rootRef.current?.querySelector<HTMLElement>(".showcase-hero-content");
      if (heroSection && heroContent) {
        gsap.to(heroContent, {
          y: "-4vh",
          opacity: 0.5,
          ease: "none",
          scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom top", scrub: 0.6 },
        });
      }

      // gallery: clip-path batch reveals + counter-zoom + persistent parallax
      gsap.matchMedia().add(
        { desktop: "(min-width: 768px)", mobile: "(max-width: 767px)" },
        (mmCtx) => {
          const mobile = mmCtx.conditions?.mobile;
          const cards = gsap.utils.toArray<HTMLElement>(".showcase-media");
          if (!cards.length) return;

          if (mobile) {
            gsap.set(cards, { opacity: 0, y: 48 });
            ScrollTrigger.batch(cards, {
              start: "top 90%",
              once: true,
              onEnter: (b) =>
                gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: EASE.out }),
            });
            return;
          }

          gsap.set(cards, { clipPath: "inset(16% 4% 0% 4%)", y: 56 });
          cards.forEach((card) => {
            const inner = card.querySelector<HTMLElement>(".showcase-media-inner");
            if (inner) gsap.set(inner, { scale: 1.16 });
          });
          ScrollTrigger.batch(cards, {
            start: "top 88%",
            once: true,
            onEnter: (b) =>
              b.forEach((card) => {
                const inner = card.querySelector<HTMLElement>(".showcase-media-inner");
                const tl = gsap.timeline();
                tl.to(card, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.15, ease: EASE.out }, 0);
                if (inner) tl.to(inner, { scale: 1.08, duration: 1.15, ease: EASE.out }, 0);
                const cap = card.querySelector<HTMLElement>(".showcase-cap");
                if (cap) tl.from(cap, { x: -8, opacity: 0, duration: 0.6, ease: EASE.out }, 0.6);
              }),
          });
          // persistent micro-parallax
          cards.forEach((card) => {
            const inner = card.querySelector<HTMLElement>(".showcase-media-inner");
            if (inner) {
              gsap.fromTo(
                inner,
                { yPercent: -4 },
                {
                  yPercent: 4,
                  ease: "none",
                  scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.9 },
                },
              );
            }
          });
        },
      );

      // keep triggers correct as media loads
      const imgs = rootRef.current?.querySelectorAll("img");
      let pending = imgs ? imgs.length : 0;
      if (pending === 0) ScrollTrigger.refresh();
      imgs?.forEach((img) => {
        if (img.complete) {
          pending -= 1;
          if (pending <= 0) ScrollTrigger.refresh();
        } else {
          img.addEventListener(
            "load",
            () => {
              pending -= 1;
              if (pending <= 0) ScrollTrigger.refresh();
            },
            { once: true },
          );
        }
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

  const openLightbox = (event: ReactMouseEvent<HTMLElement>, index: number) => {
    const inner = event.currentTarget.querySelector<HTMLElement>(".showcase-media-inner");
    if (!inner) return;
    const media = publicMedia[index];
    if (lenisRef.current) lenisRef.current.stop();
    setLightbox({
      sourceRect: inner.getBoundingClientRect(),
      item: {
        mediaUrl: media.media_url,
        mediaType: media.media_type,
        caption: media.caption,
        serviceType: media.serviceType,
        index,
        total: publicMedia.length,
      },
    });
  };

  const closeLightbox = () => {
    if (lenisRef.current) lenisRef.current.start();
    setLightbox(null);
  };

  return (
    <main ref={rootRef} className="min-h-screen bg-[#050505] text-[#f2f2f2]">
      <div className="precision-grid opacity-60" aria-hidden="true" />

      <section className="showcase-hero relative flex min-h-screen items-end overflow-hidden px-5 pb-12 pt-24 md:px-10 md:pb-16">
        {data?.profile?.hero_media_url ? (
          <img
            src={data.profile.hero_media_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
            fetchPriority="high"
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_28rem),linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]"
          aria-hidden="true"
        />
        <div className="film-grain" aria-hidden="true" />

        <div
          className="hero-hud-frame pointer-events-none absolute inset-x-4 bottom-4 top-20 z-10 opacity-0 md:inset-x-8 md:bottom-8 md:top-24"
          aria-hidden="true"
        >
          <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-white/30" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-white/30" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-white/30" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-white/30" />
          <span className="absolute right-0 top-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#707070]">
            Expediente — {slug}
          </span>
          <span className="absolute bottom-1 left-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#707070]">
            Showcase / Public
          </span>
        </div>

        <div className="showcase-hero-content relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <a
              href="/"
              className="garage-reveal mb-9 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070] transition-colors hover:text-[#f2f2f2]"
            >
              <Car size={15} />
              7F Digital Garage
            </a>
            <p className="garage-reveal mb-4 font-mono text-[11px] uppercase tracking-[0.32em] text-[#707070]">
              Showcase publico
            </p>
            <h1 className="showcase-title max-w-5xl text-[clamp(4rem,15vw,13rem)] font-semibold uppercase leading-[0.78] tracking-[-0.075em]">
              {loading ? "Cargando" : data?.profile?.title || title}
            </h1>
            {data?.profile?.description ? (
              <p className="garage-reveal mt-7 max-w-2xl text-[15px] leading-7 text-[#a8a8a8]">
                {data.profile.description}
              </p>
            ) : null}
            <div className="garage-reveal mt-9 flex flex-wrap gap-2.5">
              {(data?.services ?? []).map((service) => (
                <span
                  key={service.service_type}
                  className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c4c4c4] backdrop-blur-sm"
                >
                  {service.service_type}
                </span>
              ))}
            </div>
          </div>

          <aside className="garage-reveal rounded-xl border border-white/10 bg-black/45 p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.26em] text-[#787878]">
              Acceso privado
            </p>
            <p className="text-[15px] leading-7 text-[#ababab]">
              El expediente completo, garantia y recomendaciones tecnicas se consultan
              con el PIN entregado por 7Fitment.
            </p>
            <a
              href={`/portal?vehicle=${encodeURIComponent(slug)}`}
              onClick={() => {
                void trackQrEvent({
                  event_type: "cta_click",
                  path: `/auto/${slug}`,
                  element_id: "open-private-portal",
                });
              }}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#f2f2f2] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-colors duration-300 hover:bg-white"
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
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.26em] text-[#787878]">
              Auto no disponible
            </p>
            <p className="text-[16px] text-[#b8b8b8]">{error}</p>
          </div>
        ) : null}

        {!error && !loading && !publicMedia.length ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm">
            <Camera className="mx-auto mb-5 text-[#787878]" size={28} strokeWidth={1.5} />
            <p className="text-[15px] text-[#a8a8a8]">
              Galeria en preparacion. El expediente publico estara disponible pronto.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {publicMedia.map((media, index) => (
            <article
              key={`${media.media_url}-${index}`}
              onClick={(event) => openLightbox(event, index)}
              className={`showcase-media group cursor-pointer overflow-hidden rounded-lg border border-white/[0.09] bg-[#0a0a0a] transition-colors duration-300 hover:border-white/[0.2] ${
                index % 3 === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
                <span className="absolute left-4 top-3 z-10 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 backdrop-blur-md transition-colors duration-300 group-hover:text-white/85">
                  {String(index + 1).padStart(2, "0")} / {String(publicMedia.length).padStart(2, "0")}
                </span>
                <div
                  className="showcase-media-inner h-full w-full"
                  style={{ opacity: lightbox?.item.index === index ? 0 : 1 }}
                >
                  {media.media_type === "video" ? (
                    <video
                      src={media.media_url}
                      className="h-full w-full object-cover opacity-90"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={media.media_url}
                      alt={media.caption ?? media.serviceType}
                      className="h-full w-full object-cover opacity-90"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
              <div className="showcase-cap flex items-center justify-between gap-4 border-t border-white/[0.06] px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#787878]">
                  {media.serviceType}
                </p>
                <p className="truncate text-[13px] text-[#bcbcbc]">
                  {media.caption ?? "Proceso 7Fitment"}
                </p>
              </div>
            </article>
          ))}
        </div>

        {data?.social_proof?.client_testimonial || data?.social_proof?.vehicle_story ? (
          <section className="showcase-media mt-16 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#626262]">Historia del build</p>
              <p className="mt-5 text-[22px] font-light leading-8 tracking-[-0.035em] text-[#d8d8d8]">
                {data.social_proof.vehicle_story}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#626262]">Propietario</p>
              <blockquote className="mt-5 text-[17px] leading-8 text-[#a8a8a8]">
                {data.social_proof.client_testimonial}
              </blockquote>
              {data.social_proof.photographer_credit ? <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[#626262]">Imagen / {data.social_proof.photographer_credit}</p> : null}
            </div>
          </section>
        ) : null}
      </section>

      {lightbox ? (
        <MediaLightbox item={lightbox.item} sourceRect={lightbox.sourceRect} onClose={closeLightbox} />
      ) : null}
    </main>
  );
}
