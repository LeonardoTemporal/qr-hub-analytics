/**
 * EnlacesHeader - Fixed sticky header for Enlaces page
 *
 * Luxury Automotive aesthetic (Porsche/Apple)
 * Subtle glassmorphism with scroll-aware background
 * Client-facing design with welcoming message
 */

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function EnlacesHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.08]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 lg:h-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-sm sm:text-base lg:text-lg font-light text-white/90 tracking-wide">
            Bienvenido a{" "}
            <span className="gradient-text font-medium">7Fitment</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 hidden sm:block">
            Personalización Automotriz de Ultralujo
          </p>
        </div>
      </div>
    </motion.header>
  );
}
