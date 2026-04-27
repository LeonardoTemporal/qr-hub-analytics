"use client";

import { useCallback, useRef, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
} from "lucide-react";

interface LinkItem {
  label: string;
  href: string;
  icon: ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
  external: boolean;
}

const links: LinkItem[] = [
  {
    label: "Cotiza tu proyecto",
    href: "https://wa.me/5210000000000",
    icon: MessageCircle,
    external: true,
  },
  {
    label: "Visítanos en Satélite",
    href: "https://maps.google.com",
    icon: MapPin,
    external: true,
  },
  {
    label: "Seguínos en Instagram",
    href: "https://instagram.com/7fitment",
    icon: Instagram,
    external: true,
  },
  {
    label: "Nuestra página web",
    href: "/",
    icon: Globe,
    external: false,
  },
];

export default function EnlacesPage() {
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
      const card = cardRefs.current[index];
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    },
    [],
  );

  return (
    <div
      className="min-h-screen relative flex flex-col items-center"
      style={{ background: "#050505" }}
    >
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: 0.4 }}
      >
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(242,242,242,0.03) 0%, transparent 70%)",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </div>

      <div
        className="absolute top-6 left-6 z-10 enlaces-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-dm font-medium text-[14px] tracking-[0.02em] text-text-body hover:text-text-primary transition-colors duration-300"
        >
          <ArrowLeft size={18} />
          <span>Inicio</span>
        </Link>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[480px] mx-auto px-6 pt-16 pb-16">
        <div
          className="w-[100px] h-[100px] rounded-full border border-[rgba(242,242,242,0.1)] flex items-center justify-center mb-6 animate-spin-slow enlaces-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="font-dm font-black text-[32px] text-text-primary">
            7F
          </span>
        </div>

        <h1
          className="font-dm font-black text-[28px] text-text-primary tracking-[-0.04em] mb-3 enlaces-fade-in"
          style={{ animationDelay: "0.35s" }}
        >
          7Fitment
        </h1>

        <p
          className="font-dm font-medium text-[15px] text-text-body text-center leading-[1.6] max-w-[340px] mb-10 enlaces-fade-in"
          style={{ animationDelay: "0.45s" }}
        >
          Personalización y protección premium para tu auto. WRAP, Gráficos,
          Detailing y PPF con los mejores estándares del mercado.
        </p>

        <div
          className="w-10 h-px bg-[rgba(242,242,242,0.08)] mb-10 enlaces-fade-in"
          style={{ animationDelay: "0.55s" }}
        />

        <div className="w-full space-y-3">
          {links.map((link, index) => {
            const Icon = link.icon;
            const delay = 0.6 + index * 0.08;

            if (link.external) {
              return (
                <a
                  key={link.label}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  className="group link-card-glow relative flex items-center gap-4 w-full bg-bg-card border border-[rgba(242,242,242,0.06)] px-5 py-4 hover:border-[rgba(242,242,242,0.12)] transition-all duration-300 enlaces-fade-in cursor-pointer"
                  style={{ borderRadius: 0, animationDelay: `${delay}s` }}
                >
                  <div className="relative z-10 flex items-center gap-4 w-full">
                    <div className="w-10 h-10 rounded-full border border-[rgba(242,242,242,0.08)] flex items-center justify-center shrink-0 group-hover:border-[rgba(242,242,242,0.18)] transition-colors duration-300">
                      <Icon
                        size={16}
                        className="text-text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className="font-dm font-bold text-[15px] text-text-primary flex-1 tracking-[-0.01em]">
                      {link.label}
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-accent-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all duration-300"
                      strokeWidth={2}
                    />
                  </div>
                </a>
              );
            }

            return (
              <Link
                key={link.label}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                href={link.href}
                onMouseMove={(e) => handleMouseMove(e, index)}
                className="group link-card-glow relative flex items-center gap-4 w-full bg-bg-card border border-[rgba(242,242,242,0.06)] px-5 py-4 hover:border-[rgba(242,242,242,0.12)] transition-all duration-300 enlaces-fade-in cursor-pointer"
                style={{ borderRadius: 0, animationDelay: `${delay}s` }}
              >
                <div className="relative z-10 flex items-center gap-4 w-full">
                  <div className="w-10 h-10 rounded-full border border-[rgba(242,242,242,0.08)] flex items-center justify-center shrink-0 group-hover:border-[rgba(242,242,242,0.18)] transition-colors duration-300">
                    <Icon
                      size={16}
                      className="text-text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="font-dm font-bold text-[15px] text-text-primary flex-1 tracking-[-0.01em]">
                    {link.label}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-accent-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all duration-300"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        <div
          className="mt-14 flex items-center gap-2 enlaces-fade-in"
          style={{ animationDelay: "1s" }}
        >
          <span className="font-dm font-black text-[13px] text-text-primary tracking-[-0.02em]">
            7FITMENT
          </span>
          <span className="text-accent-muted text-[11px]">|</span>
          <span className="font-dm font-medium text-[11px] text-accent-muted tracking-[0.02em]">
            ESTÉTICA AUTOMOTRIZ
          </span>
        </div>
      </div>
    </div>
  );
}
