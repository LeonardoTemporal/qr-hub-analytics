"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useScrollPosition } from "@/hooks/useScrollPosition";

const HERO_TEXT = "7FITMENT";

interface HeroSectionProps {
  /**
   * Cuando es true, dispara el reveal letter-by-letter con GSAP.
   * Pasar !loading desde la Page para sincronizar con la salida del Loader.
   */
  isReady?: boolean;
}

// useLayoutEffect en SSR no se puede ejecutar; alias seguro para Next.js.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Hero con título masivo letter-by-letter via GSAP.
 *
 * Estrategia anti-flash:
 *  - useLayoutEffect (síncrono antes de paint) ejecuta `gsap.set()` en mount
 *    para colocar las letras en yPercent: 100 (ocultas) y subtítulo/isotipo
 *    en opacity: 0. Esto evita el flash inicial sin depender de inline styles
 *    que React pudiera estar reseteando.
 *  - Cuando isReady=true, useEffect dispara las animaciones GSAP de entrada.
 *  - hasAnimatedRef previene que la animación se cancele por el doble-mount
 *    de React 19 Strict Mode en dev.
 */
export default function HeroSection({ isReady = true }: HeroSectionProps) {
  const scrollY = useScrollPosition();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const isotipoRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const vh50 =
    typeof window !== "undefined" ? window.innerHeight * 0.5 : 500;
  const progress = Math.min(scrollY / vh50, 1);
  const opacity = 1 - progress;
  const translateY = -progress * 60;

  // Estado inicial síncrono (antes del primer paint)
  useIsoLayoutEffect(() => {
    const letters = titleRef.current?.querySelectorAll(".hero-letter-inner");
    if (letters && letters.length > 0) {
      gsap.set(letters, { yPercent: 100 });
    }
    if (subtitleRef.current) {
      gsap.set(subtitleRef.current, { y: 30, opacity: 0 });
    }
    if (isotipoRef.current) {
      gsap.set(isotipoRef.current, { y: 30, opacity: 0 });
    }
  }, []);

  // Animación de entrada cuando isReady cambia a true
  useEffect(() => {
    if (!isReady) return;
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const letters = titleRef.current?.querySelectorAll(".hero-letter-inner");
    if (!letters || letters.length === 0) return;

    // Animación de letras
    gsap.to(letters, {
      yPercent: 0,
      duration: reduced ? 0.2 : 1.0,
      delay: reduced ? 0 : 0.15,
      ease: "expo.out",
      stagger: reduced ? 0 : 0.05,
    });

    // Subtítulo
    if (subtitleRef.current) {
      gsap.to(subtitleRef.current, {
        y: 0,
        opacity: 1,
        duration: reduced ? 0.2 : 0.9,
        delay: reduced ? 0.1 : 0.7,
        ease: "power3.out",
      });
    }

    // Isotipo
    if (isotipoRef.current) {
      gsap.to(isotipoRef.current, {
        y: 0,
        opacity: 1,
        duration: reduced ? 0.2 : 0.8,
        delay: reduced ? 0.2 : 1.0,
        ease: "power3.out",
      });
    }
  }, [isReady]);

  return (
    <section
      id="inicio"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url(/images/img-hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center text-center px-6"
        style={{
          opacity: Math.max(opacity, 0),
          transform: `translateY(${translateY}px)`,
        }}
      >
        <h1
          ref={titleRef}
          aria-label={HERO_TEXT}
          className="font-dm font-black leading-[0.85] tracking-[-0.06em] text-text-primary text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem]"
        >
          {HERO_TEXT.split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              aria-hidden="true"
              className="inline-block overflow-hidden align-baseline pb-[0.05em]"
            >
              <span className="hero-letter-inner inline-block">
                {letter}
              </span>
            </span>
          ))}
        </h1>

        <p
          ref={subtitleRef}
          className="font-dm font-medium text-[18px] md:text-[22px] text-text-body max-w-[600px] mt-8 leading-[1.6]"
        >
          El estándar definitivo en estética y cuidado automotriz.
        </p>

        <div ref={isotipoRef} className="mt-12">
          <div className="w-20 h-20 rounded-full border border-[rgba(242,242,242,0.15)] flex items-center justify-center animate-spin-slow overflow-hidden">
            <Image
              src="/media/7Fitment_Logo.PNG"
              alt="7Fitment"
              width={56}
              height={56}
              priority
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
