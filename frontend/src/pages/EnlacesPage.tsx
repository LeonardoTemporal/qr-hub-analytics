import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MessageCircle,
} from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import LocationSoftPrompt from "../components/LocationSoftPrompt";
import { contactLinks, type LinkItem } from "../data/links";
import { useLenis } from "../hooks/useLenis";
import { trackQrEvent } from "../lib/api";
import { EASE, gsap, prefersReducedMotion } from "../lib/motion";

const workPreviews = [
  {
    src: "/assets/media/work/r8-plata-mate-sm.webp",
    srcSet:
      "/assets/media/work/r8-plata-mate-sm.webp 900w, /assets/media/work/r8-plata-mate-lg.webp 1600w",
    alt: "Audi R8 con acabado plata mate realizado por 7Fitment",
    label: "R8 / Plata mate",
    className: "col-span-2 aspect-[16/10] sm:col-span-1 sm:row-span-2 sm:aspect-auto",
  },
  {
    src: "/assets/media/work/corvette-purple-sm.webp",
    srcSet:
      "/assets/media/work/corvette-purple-sm.webp 900w, /assets/media/work/corvette-purple-lg.webp 1600w",
    alt: "Corvette con wrap morado realizado por 7Fitment",
    label: "Corvette / Purple",
    className: "aspect-[4/3]",
  },
  {
    src: "/assets/media/work/porsche-yellow-sm.webp",
    srcSet:
      "/assets/media/work/porsche-yellow-sm.webp 900w, /assets/media/work/porsche-yellow-lg.webp 1600w",
    alt: "Porsche amarillo preparado por 7Fitment",
    label: "Porsche / Signal",
    className: "aspect-[4/3]",
  },
];

function recordLinkClick(item: LinkItem): void {
  void trackQrEvent({
    event_type: "cta_click",
    path: "/enlaces",
    element_id: item.analyticsId,
    metadata: { destination: item.href },
  });
}

function trackSheen(event: MouseEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
}

export default function EnlacesPage() {
  const rootRef = useRef<HTMLElement>(null);
  const primaryLink = contactLinks.find((item) => item.analyticsId === "quote-project");
  const secondaryLinks = contactLinks.filter((item) => item.analyticsId !== "quote-project");
  useLenis();

  useEffect(() => {
    void trackQrEvent({ event_type: "destination_view", path: "/enlaces" });
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const targets = [".enlaces-brand", ".enlaces-copy", ".enlaces-primary", ".enlaces-work", ".enlaces-link"];
    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, y: 0, clipPath: "none" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: EASE.text } })
        .fromTo(
          ".enlaces-brand",
          { opacity: 0, y: 12, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
        )
        .fromTo(
          ".enlaces-copy",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 },
          "-=0.55",
        )
        .fromTo(
          ".enlaces-primary",
          { opacity: 0, y: 28, clipPath: "inset(0 0 100% 0)" },
          { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.9 },
          "-=0.45",
        )
        .fromTo(
          ".enlaces-work",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.85, stagger: 0.1 },
          "-=0.55",
        )
        .fromTo(
          ".enlaces-link",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 },
          "-=0.55",
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  if (!primaryLink) return null;

  return (
    <main
      ref={rootRef}
      className="relative min-h-dvh overflow-x-clip bg-[#050505] px-5 pb-16 pt-5 font-sans text-[#f2f2f2] sm:px-8 sm:pb-20 sm:pt-7 lg:px-12"
    >
      <div className="precision-grid opacity-65" aria-hidden="true" />
      <div className="film-grain fixed inset-0" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
      <LocationSoftPrompt />

      <header className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center justify-between border-b border-white/[0.06] pb-5">
        <a
          href="/"
          className="focus-ring enlaces-copy inline-flex min-h-11 items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a8a8a] transition-colors duration-300 hover:text-white"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          Volver al estudio
        </a>
        <span className="enlaces-copy hidden font-mono text-[9px] uppercase tracking-[0.24em] text-[#5a5a5a] sm:block">
          Satélite / Edo. Méx.
        </span>
      </header>

      <div className="relative z-10 mx-auto mt-12 grid w-full max-w-[1180px] gap-14 sm:mt-16 lg:mt-24 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-20 xl:gap-28">
        <section className="lg:sticky lg:top-12 lg:self-start">
          <div className="enlaces-brand flex items-center justify-between border-b border-white/[0.08] pb-7">
            <img
              src="/assets/7fitment-logo.png"
              alt="7Fitment"
              width="800"
              height="664"
              className="h-auto w-[76px] object-contain sm:w-[88px]"
              fetchPriority="high"
            />
            <div className="text-right font-mono text-[9px] uppercase leading-5 tracking-[0.2em] text-[#5c5c5c]">
              <span className="block text-[#a2a2a2]">7F / Contact</span>
              Link directory
            </div>
          </div>

          <p className="enlaces-copy mt-10 font-mono text-[10px] uppercase tracking-[0.28em] text-[#7d7d7d]">
            Estética automotriz de precisión
          </p>
          <h1 className="enlaces-copy mt-5 max-w-[560px] text-[clamp(3rem,12vw,5.1rem)] font-medium leading-[0.9] tracking-[-0.055em]">
            Tu auto.
            <span className="block text-[#6f6f6f]">Tu visión.</span>
            Sin atajos.
          </h1>
          <p className="enlaces-copy mt-7 max-w-[460px] text-[15px] leading-8 text-[#9d9d9d] sm:text-[16px]">
            Wrap, PPF y protección cerámica ejecutados con criterio técnico para vehículos que exigen más.
          </p>

          <a
            href={primaryLink.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => recordLinkClick(primaryLink)}
            className="focus-ring enlaces-primary group mt-10 block overflow-hidden rounded-lg border border-white bg-[#f2f2f2] text-[#050505] shadow-[0_24px_60px_-24px_rgba(242,242,242,0.28)] transition-all duration-300 hover:bg-white hover:shadow-[0_32px_72px_-24px_rgba(242,242,242,0.36)] sm:mt-12"
            aria-label="Cotizar por WhatsApp"
          >
            <span className="flex min-h-[148px] items-start justify-between gap-6 p-6 sm:min-h-[164px] sm:p-7">
              <span>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-black/55">
                  <MessageCircle size={14} strokeWidth={1.6} />
                  Atención directa
                </span>
                <span className="mt-7 block text-[28px] font-semibold leading-none tracking-[-0.05em] sm:text-[34px]">
                  Cotizar por WhatsApp
                </span>
                <span className="mt-4 flex items-center gap-2 text-[12px] text-black/60">
                  <Clock3 size={13} strokeWidth={1.6} /> Respuesta personal del estudio
                </span>
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/15 transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight size={18} strokeWidth={1.6} />
              </span>
            </span>
            <span className="block h-[3px] origin-left scale-x-[0.18] bg-black transition-transform duration-500 group-hover:scale-x-100" aria-hidden="true" />
          </a>

          <p className="enlaces-copy mt-5 font-mono text-[9px] uppercase leading-5 tracking-[0.18em] text-[#585858]">
            Comparte modelo, año y el acabado que buscas. Te orientamos sin compromiso.
          </p>
        </section>

        <section className="min-w-0">
          <div className="enlaces-work flex items-end justify-between gap-5 border-b border-white/[0.08] pb-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#6c6c6c]">Selección / 03</p>
              <h2 className="mt-2.5 text-[26px] font-medium tracking-[-0.04em] sm:text-[32px]">
                Trabajos que hablan por sí solos.
              </h2>
            </div>
            <a
              href="https://www.instagram.com/7fitment/"
              target="_blank"
              rel="noreferrer"
              className="focus-ring hidden min-h-11 shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8d8d8d] transition-colors duration-300 hover:text-white sm:flex"
              onClick={() => {
                const instagram = contactLinks.find((item) => item.analyticsId === "instagram");
                if (instagram) recordLinkClick(instagram);
              }}
            >
              Ver Instagram <ArrowUpRight size={14} />
            </a>
          </div>

          <a
            href="https://www.instagram.com/7fitment/"
            target="_blank"
            rel="noreferrer"
            aria-label="Ver trabajos de 7Fitment en Instagram"
            className="mt-6 grid grid-cols-2 gap-3 sm:h-[520px] sm:grid-cols-[1.18fr_0.82fr] sm:grid-rows-2"
            onClick={() => {
              const instagram = contactLinks.find((item) => item.analyticsId === "instagram");
              if (instagram) recordLinkClick(instagram);
            }}
          >
            {workPreviews.map((work, index) => (
              <figure
                key={work.src}
                data-testid="enlaces-work-preview"
                className={`enlaces-work group relative m-0 min-h-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0a0a] ${work.className}`}
              >
                <img
                  src={work.src}
                  srcSet={work.srcSet}
                  sizes={index === 0 ? "(min-width: 1024px) 34vw, 100vw" : "(min-width: 1024px) 22vw, 50vw"}
                  alt={work.alt}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" aria-hidden="true" />
                <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md border border-white/10 bg-black/35 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:inset-x-4 sm:bottom-4">
                  <span>{String(index + 1).padStart(2, "0")} / {work.label}</span>
                  <ArrowUpRight size={13} />
                </figcaption>
              </figure>
            ))}
          </a>

          <div className="mt-12 flex items-center justify-between border-b border-white/[0.08] pb-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#6c6c6c]">Más formas de encontrarnos</p>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[#484848]">01 — 03</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {secondaryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.analyticsId}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  onClick={() => recordLinkClick(item)}
                  onMouseMove={trackSheen}
                  className="focus-ring link-sheen enlaces-link group relative flex min-h-[120px] items-center gap-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.18] hover:bg-white/[0.05] sm:min-h-[176px] sm:flex-col sm:items-start sm:justify-between"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/[0.1] bg-white/[0.04] text-[#b0b0b0] transition-colors duration-300 group-hover:border-white/25 group-hover:text-white">
                    <Icon size={16} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 sm:flex-none">
                    <span className="block font-mono text-[8px] uppercase tracking-[0.2em] text-[#666]">{item.eyebrow}</span>
                    <span className="mt-2.5 block text-[16px] font-medium tracking-[-0.03em] text-[#dcdcdc]">{item.label}</span>
                  </span>
                  <ArrowUpRight className="shrink-0 text-[#5c5c5c] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white sm:absolute sm:right-5 sm:top-5" size={15} />
                </a>
              );
            })}
          </div>

          <footer className="enlaces-copy mt-12 flex flex-col gap-3 border-t border-white/[0.08] pt-6 font-mono text-[8px] uppercase tracking-[0.18em] text-[#525252] sm:flex-row sm:items-center sm:justify-between">
            <span>19.50°N 99.23°W / Satélite</span>
            <span>Wrap / PPF / Ceramic</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
