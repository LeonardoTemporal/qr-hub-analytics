/**
 * LinkCard - Boton de enlace premium
 *
 * Estetica Luxury Automotive (Porsche/Apple)
 * Glassmorphism sutil con animaciones fluidas
 * Totalmente responsive (mobile-first)
 */

"use client";

import {
  Globe,
  Instagram,
  Link,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import type { SocialLink } from "@/types/campaign";

const ICON_MAP = {
  MessageCircle,
  Instagram,
  Globe,
  Link,
  MapPin,
  Phone,
  Mail,
} as const;

interface LinkCardProps {
  link: SocialLink;
}

export function LinkCard({ link }: LinkCardProps) {
  const Icon = ICON_MAP[link.icon] ?? Link;

  return (
    <motion.a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={[
        // Base Layout
        "group flex items-center gap-4 w-full min-h-[60px] sm:min-h-[64px] px-5 sm:px-6 py-4",
        "rounded-2xl border border-white/[0.08]",
        "text-white font-medium text-sm sm:text-base tracking-wide",
        // Glassmorphism
        "bg-white/[0.03] backdrop-blur-sm",
        // Interaction States
        "transition-all duration-300 ease-out",
        "hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-xl hover:shadow-white/[0.02]",
        // Focus Accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      ].join(" ")}
    >
      {/* Icon Container */}
      <span className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/[0.05] shrink-0 border border-white/[0.08] transition-all duration-300 group-hover:bg-white/[0.1] group-hover:border-white/[0.15]">
        <Icon 
          size={18} 
          strokeWidth={1.5} 
          className="text-white/80 group-hover:text-white transition-colors duration-300" 
          aria-hidden="true" 
        />
      </span>
      
      {/* Label */}
      <span className="flex-1 text-white/90 group-hover:text-white transition-colors duration-300">
        {link.label}
      </span>
      
      {/* Arrow Indicator */}
      <svg
        aria-hidden="true"
        className="opacity-30 shrink-0 transition-all duration-300 group-hover:opacity-60 group-hover:translate-x-0.5"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 7h10M7 2l5 5-5 5" />
      </svg>
    </motion.a>
  );
}
