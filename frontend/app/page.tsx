"use client";

import { useState, useEffect, useRef } from "react";
import Lenis from "lenis";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GhostMarquee from "@/components/GhostMarquee";
import PersonalizacionSection from "@/components/PersonalizacionSection";
import TabSwitcher from "@/components/TabSwitcher";
import PortafolioSection from "@/components/PortafolioSection";
import ContactoSection from "@/components/ContactoSection";

export default function Page() {
  const [isLoaded, setIsLoaded] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;

    if (!reduced) {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      });
      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    return () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [isLoaded]);

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <Loader onComplete={() => setIsLoaded(true)} />
      <Navbar />
      <HeroSection isReady={isLoaded} />
      <GhostMarquee />
      <PersonalizacionSection />
      <TabSwitcher />
      <PortafolioSection />
      <ContactoSection />
    </div>
  );
}
