import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MessageCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
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
      className="relative min-h-dvh overflow-x-clip bg-[#050505] px-4 pb-10 pt-4 font-sans text-[#f2f2f2] sm:px-6 sm:pb-14 sm:pt-6 lg:px-10"
    >
      <div className="precision-grid opacity-65" aria-hidden="true" />
      <div className="film-grain fixed inset-0" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
      <LocationSoftPrompt />

      <header className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center justify-between">
        <a
          href="/"
          className="focus-ring enlaces-copy inline-flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7d7d7d] transition-colors hover:text-white"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          Volver al estudio
        </a>
        <span className="enlaces-copy hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[#525252] sm:block">
          Satélite / Edo. Méx.
        </span>
      </header>

      <div className="relative z-10 mx-auto mt-10 grid w-full max-w-[1180px] gap-12 sm:mt-14 lg:mt-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-16 xl:gap-24">
        <section className="lg:sticky lg:top-12 lg:self-start">
          <div className="enlaces-brand flex items-center justify-between border-b border-white/[0.08] pb-6">
            <img
              src="/assets/7fitment-logo.png"
              alt="7Fitment"
              width="800"
              height="664"
              className="h-auto w-[76px] object-contain sm:w-[88px]"
              fetchPriority="high"
            />
            <div className="text-right font-mono text-[9px] uppercase leading-5 tracking-[0.18em] text-[#585858]">
              <span className="block text-[#9a9a9a]">7F / Contact</span>
              Link directory
            </div>
          </div>

          <p className="enlaces-copy mt-9 font-mono text-[10px] uppercase tracking-[0.26em] text-[#777]">
            Estética automotriz de precisión
          </p>
          <h1 className="enlaces-copy mt-4 max-w-[560px] text-[clamp(2.9rem,12vw,4.9rem)] font-medium leading-[0.88] tracking-[-0.06em]">
            Tu auto.
            <span className="block text-[#777]">Tu visión.</span>
            Sin atajos.
          </h1>
          <p className="enlaces-copy mt-6 max-w-[480px] text-[15px] leading-7 text-[#999] sm:text-[16px]">
            Wrap, PPF y protección cerámica ejecutados con criterio técnico para vehículos que exigen más.
          </p>

          <a
            href={primaryLink.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => recordLinkClick(primaryLink)}
            className="focus-ring enlaces-primary group mt-9 block overflow-hidden border border-white bg-[#f2f2f2] text-[#050505] transition-colors duration-300 hover:bg-white sm:mt-10"
            aria-label="Cotizar por WhatsApp"
          >
            <span className="flex min-h-[132px] items-start justify-between gap-5 p-5 sm:min-h-[148px] sm:p-6">
              <span>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-black/55">
                  <MessageCircle size={14} strokeWidth={1.6} />
                  Atención directa
                </span>
                <span className="mt-6 block text-[27px] font-semibold leading-none tracking-[-0.055em] sm:text-[32px]">
                  Cotizar por WhatsApp
                </span>
                <span className="mt-3 flex items-center gap-2 text-[12px] text-black/60">
                  <Clock3 size={13} strokeWidth={1.6} /> Respuesta personal del estudio
                </span>
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center border border-black/15 transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight size={18} strokeWidth={1.6} />
              </span>
            </span>
            <span className="block h-[3px] origin-left scale-x-[0.18] bg-black transition-transform duration-500 group-hover:scale-x-100" aria-hidden="true" />
          </a>

          <p className="enlaces-copy mt-4 font-mono text-[9px] uppercase leading-5 tracking-[0.16em] text-[#555]">
            Comparte modelo, año y el acabado que buscas. Te orientamos sin compromiso.
          </p>
        </section>

        <section className="min-w-0">
          <div className="enlaces-work flex items-end justify-between gap-5 border-b border-white/[0.08] pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#666]">Selección / 03</p>
              <h2 className="mt-2 text-[25px] font-medium tracking-[-0.045em] sm:text-[31px]">
                Trabajos que hablan por sí solos.
              </h2>
            </div>
            <a
              href="https://www.instagram.com/7fitment/"
              target="_blank"
              rel="noreferrer"
              className="focus-ring hidden min-h-11 shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#888] transition-colors hover:text-white sm:flex"
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
            className="mt-4 grid grid-cols-2 gap-2 sm:h-[490px] sm:grid-cols-[1.18fr_0.82fr] sm:grid-rows-2"
            onClick={() => {
              const instagram = contactLinks.find((item) => item.analyticsId === "instagram");
              if (instagram) recordLinkClick(instagram);
            }}
          >
            {workPreviews.map((work, index) => (
              <figure
                key={work.src}
                data-testid="enlaces-work-preview"
                className={`enlaces-work group relative m-0 min-h-0 overflow-hidden border border-white/[0.07] bg-[#0a0a0a] ${work.className}`}
              >
                <img
                  src={work.src}
                  srcSet={work.srcSet}
                  sizes={index === 0 ? "(min-width: 1024px) 34vw, 100vw" : "(min-width: 1024px) 22vw, 50vw"}
                  alt={work.alt}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" aria-hidden="true" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 font-mono text-[8px] uppercase tracking-[0.16em] text-white/80 sm:p-4">
                  <span>{String(index + 1).padStart(2, "0")} / {work.label}</span>
                  <ArrowUpRight size={13} />
                </figcaption>
              </figure>
            ))}
          </a>

          <div className="mt-9 flex items-center justify-between border-b border-white/[0.08] pb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#666]">Más formas de encontrarnos</p>
            <span className="font-mono text-[9px] text-[#444]">01 — 03</span>
          </div>

          <div className="grid sm:grid-cols-3">
            {secondaryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.analyticsId}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  onClick={() => recordLinkClick(item)}
                  className="focus-ring enlaces-link group relative flex min-h-[112px] items-center gap-4 border-b border-white/[0.08] py-5 transition-colors hover:bg-white/[0.025] sm:min-h-[154px] sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r sm:px-4 sm:py-5 first:sm:pl-0 last:sm:border-r-0 last:sm:pr-0"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/[0.09] text-[#aaa] transition-colors group-hover:border-white/25 group-hover:text-white">
                    <Icon size={16} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 sm:flex-none">
                    <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-[#5f5f5f]">{item.eyebrow}</span>
                    <span className="mt-2 block text-[16px] font-medium tracking-[-0.035em] text-[#d8d8d8]">{item.label}</span>
                  </span>
                  <ArrowUpRight className="shrink-0 text-[#555] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" size={15} />
                </a>
              );
            })}
          </div>

          <footer className="enlaces-copy mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-5 font-mono text-[8px] uppercase tracking-[0.16em] text-[#4f4f4f] sm:flex-row sm:items-center sm:justify-between">
            <span>19.50°N 99.23°W / Satélite</span>
            <span>Wrap / PPF / Ceramic</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
