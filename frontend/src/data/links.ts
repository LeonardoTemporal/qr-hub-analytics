import { Globe, Instagram, MapPin, MessageCircle, type LucideIcon } from "lucide-react";

export interface LinkItem {
  analyticsId: string;
  label: string;
  eyebrow: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const contactLinks: LinkItem[] = [
  {
    analyticsId: "quote-project",
    label: "Cotizar proyecto",
    eyebrow: "WhatsApp directo",
    href: "https://wa.me/5215637940104?text=Hola%207Fitment%2C%20quiero%20cotizar%20un%20proyecto%20para%20mi%20auto",
    icon: MessageCircle,
    external: true,
  },
  {
    analyticsId: "instagram",
    label: "Instagram",
    eyebrow: "Trabajos recientes",
    href: "https://www.instagram.com/7fitment/",
    icon: Instagram,
    external: true,
  },
  {
    analyticsId: "location",
    label: "Ubicación",
    eyebrow: "Satélite, Edo. Méx.",
    href: "https://maps.app.goo.gl/yokwhFdPw2dJL5FWA",
    icon: MapPin,
    external: true,
  },
  {
    analyticsId: "main-site",
    label: "Sitio principal",
    eyebrow: "Servicios y portafolio",
    href: "/",
    icon: Globe,
  },
];
