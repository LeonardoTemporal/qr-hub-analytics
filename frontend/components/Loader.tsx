"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface LoaderProps {
  onComplete?: () => void;
}

/**
 * Loader inteligente:
 *  - Phase 1 (siempre): wordmark fade in + progress 0→90% durante minDuration (600ms).
 *    Esto garantiza un mínimo de presencia visual aún en cargas instantáneas.
 *  - Phase 2 (espera): mientras el progress está al 90%, espera a `window.load`.
 *  - Phase 3 (salida): cuando el página está lista Y minDuration cumplió,
 *    snap progress a 100% (250ms), hold (150ms), sweep up (900ms).
 *  - Safety cap: si nada termina, fuerza salida tras maxDuration (5s).
 */
export default function Loader({ onComplete }: LoaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const minDuration = reduced ? 200 : 600;
    const maxDuration = reduced ? 1500 : 5000;
    const startTime = performance.now();

    let pageLoaded = document.readyState === "complete";
    let exitStarted = false;

    const ctx = gsap.context(() => {
      // Fade in wordmark
      gsap.fromTo(
        wordmarkRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: reduced ? 0.1 : 0.5,
          ease: "power2.out",
        },
      );

      // Phase 1: progress 0 → 90% durante minDuration
      gsap.to(progressRef.current, {
        scaleX: 0.9,
        duration: minDuration / 1000,
        ease: "power2.inOut",
        onComplete: () => {
          tryExit();
        },
      });
    });

    function tryExit() {
      if (exitStarted) return;
      const elapsed = performance.now() - startTime;
      // Necesitamos que el página esté lista Y que se haya cumplido minDuration
      if (!pageLoaded || elapsed < minDuration) return;

      exitStarted = true;

      const exitTl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = "";
          setHidden(true);
          onComplete?.();
        },
      });

      // Snap progress a 100%
      exitTl.to(progressRef.current, {
        scaleX: 1,
        duration: reduced ? 0.1 : 0.25,
        ease: "power2.out",
      });

      // Hold breve
      if (!reduced) {
        exitTl.to({}, { duration: 0.15 });
      }

      // Sweep up para revelar la página
      exitTl.to(overlayRef.current, {
        yPercent: -101,
        duration: reduced ? 0.3 : 0.9,
        ease: "power3.inOut",
      });
    }

    // Detector de page-load
    const onLoad = () => {
      pageLoaded = true;
      tryExit();
    };

    if (pageLoaded) {
      // Ya estaba listo (typical SPA hot-reload). Disparar tryExit cuando minDuration termine.
      // (tryExit se llama desde onComplete del progress arriba)
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    // Safety cap
    const safetyTimeout = window.setTimeout(() => {
      pageLoaded = true;
      tryExit();
    }, maxDuration);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(safetyTimeout);
      ctx.revert();
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  if (hidden) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "#050505" }}
    >
      <div className="flex flex-col items-center gap-10">
        <span
          ref={wordmarkRef}
          className="font-dm font-black uppercase text-[20px] tracking-[0.5em] text-text-primary sm:text-[24px]"
          style={{ opacity: 0 }}
        >
          7Fitment
        </span>
        <div className="relative h-[2px] w-[200px] overflow-hidden bg-[rgba(242,242,242,0.1)] sm:w-[240px]">
          <div
            ref={progressRef}
            className="absolute inset-0 bg-text-primary"
            style={{ transformOrigin: "0% 50%", transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </div>
  );
}
