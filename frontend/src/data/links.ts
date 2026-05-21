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
    href: "https://wa.me/5215637940104?text=Hola%207Fitment%2C%20quiero%20cotizar%20un%20proyecto%20para%20mi%20auto",
    icon: MessageCircle,
    external: true,
  },
  {
    label: "Instagram",
    eyebrow: "Trabajos recientes",
    href: "https://www.instagram.com/7fitment/",
    icon: Instagram,
    external: true,
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
