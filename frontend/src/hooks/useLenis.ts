import { useEffect, useRef, type RefObject } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../lib/motion";

/**
 * Per-page Lenis smooth scroll synced to the GSAP ticker. Pages fully unmount
 * on route change (conditional-render router), so the Lenis lifecycle rides
 * the React lifecycle. Never mount this on LandingPage: the landing iframe
 * owns its own scroll and runs its own Lenis instance.
 */
export function useLenis(enabled = true): RefObject<Lenis | null> {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;

    const lenis = new Lenis({ autoRaf: false });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.scrollTo(0, 0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [enabled]);

  return lenisRef;
}
