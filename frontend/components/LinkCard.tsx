/**
 * LinkCard – botón de enlace estilo Linktree.
 *
 * Diseño Mobile-First:
 *  - Bloque completo en móvil (w-full).
 *  - Altura mínima de 56 px (tap target accesible – WCAG 2.5.5).
 *  - Transición suave al hacer hover/tap.
 */

import {
  Globe,
  Instagram,
  Link,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { SocialLink } from "@/types/campaign";

// Mapa de componentes de icono indexado por nombre
const ICON_MAP = {
  MessageCircle,
  Instagram,
  Globe,
  Link,
  Phone,
  Mail,
} as const;

interface LinkCardProps {
  link: SocialLink;
}

export function LinkCard({ link }: LinkCardProps) {
  const Icon = ICON_MAP[link.icon] ?? Link;

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        // Base
        "flex items-center gap-4 w-full min-h-[56px] px-5 py-3",
        "rounded-2xl border border-white/10",
        "text-white font-medium text-sm tracking-wide",
        // Color personalizable (fallback al card oscuro)
        link.colorClass ?? "bg-white/5",
        // Interacción
        "transition-all duration-200 ease-in-out",
        "hover:scale-[1.02] hover:border-white/25 hover:shadow-lg",
        "active:scale-[0.98]",
        // Accesibilidad
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
      ].join(" ")}
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shrink-0">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="flex-1">{link.label}</span>
      {/* Flecha sutil de navegación */}
      <svg
        aria-hidden="true"
        className="opacity-30 shrink-0"
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
    </a>
  );
}
