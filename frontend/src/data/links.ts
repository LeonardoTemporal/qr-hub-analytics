import { Globe, Instagram, MapPin, MessageCircle, type LucideIcon } from "lucide-react";

export interface LinkItem {
  label: string;
  eyebrow: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const contactLinks: LinkItem[] = [
  {
    label: "Cotizar proyecto",
    eyebrow: "WhatsApp directo",
    href: "/t/web_whatsapp",
    icon: MessageCircle,
  },
  {
    label: "Instagram",
    eyebrow: "Trabajos recientes",
    href: "/t/web_instagram",
    icon: Instagram,
  },
  {
    label: "Ubicación",
    eyebrow: "Satélite, Edo. Méx.",
    href: "https://maps.app.goo.gl/yokwhFdPw2dJL5FWA",
    icon: MapPin,
    external: true,
  },
  {
    label: "Sitio principal",
    eyebrow: "Servicios y portafolio",
    href: "/",
    icon: Globe,
  },
];
