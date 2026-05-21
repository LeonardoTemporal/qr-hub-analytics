import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import LocationSoftPrompt from "../components/LocationSoftPrompt";
import { contactLinks } from "../data/links";

export default function EnlacesPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!rootRef.current) return;
    if (reduce) {
      gsap.set([".mark-reveal", ".copy-reveal", ".link-reveal"], {
        opacity: 1,
        y: 0,
      });
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });
      timeline
        .fromTo(
          ".mark-reveal",
          { opacity: 0, y: 10, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
        )
        .fromTo(
          ".copy-reveal",
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.74, stagger: 0.07 },
          "-=0.52",
        )
        .fromTo(
          ".link-reveal",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.84, stagger: 0.095 },
          "-=0.28",
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>, index: number) => {
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  };

  return (
    <main
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-5 py-6 font-sans text-[#f2f2f2]"
    >
      <div className="precision-grid opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10"
        aria-hidden="true"
      />
      <LocationSoftPrompt />

      <a
        href="/"
        className="focus-ring copy-reveal relative z-10 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#707070] transition-colors hover:text-[#f2f2f2]"
      >
        <ArrowLeft size={16} />
        Inicio
      </a>

      <section className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[440px] flex-col justify-center pb-8 pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="mark-reveal mb-8 flex h-[76px] w-[76px] items-center justify-center border border-white/10 bg-[#050505] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
            <span className="text-[22px] font-semibold tracking-[-0.06em] text-[#f2f2f2]">
              7F
            </span>
          </div>
          <p className="copy-reveal text-[11px] font-medium uppercase tracking-[0.28em] text-[#707070]">
            Estetica automotriz premium
          </p>
          <h1 className="copy-reveal mt-4 text-[44px] font-semibold leading-none tracking-[-0.06em]">
            7FITMENT
          </h1>
          <p className="copy-reveal mt-5 max-w-[330px] text-[15px] font-normal leading-7 text-[#a8a8a8]">
            Wraps, PPF, ceramicos y detalle tecnico para autos de gama alta.
          </p>
        </div>

        <div className="mt-11 grid gap-3">
          {contactLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                onPointerMove={(event) => handlePointerMove(event, index)}
                className="focus-ring link-reveal link-sheen group flex min-h-[86px] items-center gap-4 border border-white/5 bg-[#0f0f0f] px-4 py-5 transition-colors duration-300 hover:border-white/15 hover:bg-[#121212]"
              >
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center border border-white/5 bg-[#050505] text-[#d8d8d8]">
                  <Icon size={18} strokeWidth={1.5} />
                </span>
                <span className="relative z-10 min-w-0 flex-1 text-left">
                  <span className="block text-[10px] font-mono uppercase leading-none tracking-widest text-[#707070]">
                    {item.eyebrow}
                  </span>
                  <span className="mt-2 block truncate text-[18px] font-semibold leading-[1.12] tracking-[-0.05em] text-[#f2f2f2]">
                    {item.label}
                  </span>
                </span>
                <ArrowUpRight className="relative z-10 shrink-0 text-[#707070] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f2f2f2]" size={18} />
              </a>
            );
          })}
        </div>

        <div className="copy-reveal mt-10 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
          <span className="h-px w-8 bg-white/10" />
          Satélite, Edo. Méx.
          <span className="h-px w-8 bg-white/10" />
        </div>
      </section>
    </main>
  );
}
