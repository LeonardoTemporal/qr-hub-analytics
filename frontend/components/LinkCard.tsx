/**
 * LinkCard – botón de enlace premium estilo glassmorphism
 *
 * Premium black/white aesthetic
 * Diseño Mobile-First con animaciones suaves
 */

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

// Mapa de componentes de icono indexado por nombre
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
        // Base
        "flex items-center gap-4 w-full min-h-[56px] px-6 py-4",
        "rounded-2xl border border-white/10",
        "text-white font-medium text-sm tracking-wide",
        // Glassmorphism premium
        "bg-white/5 backdrop-blur-sm",
        // Interacción
        "transition-all duration-200 ease-in-out",
        "hover:bg-white/10 hover:border-white/20 hover:shadow-xl",
        // Accesibilidad
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      ].join(" ")}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 shrink-0 border border-white/10">
        <Icon size={18} strokeWidth={2} className="text-white" aria-hidden="true" />
      </span>
      <span className="flex-1">{link.label}</span>
      {/* Flecha sutil de navegación */}
      <svg
        aria-hidden="true"
        className="opacity-20 shrink-0"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 7h10M7 2l5 5-5 5" />
      </svg>
    </motion.a>
  );
}
