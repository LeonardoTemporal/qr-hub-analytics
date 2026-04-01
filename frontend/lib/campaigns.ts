/**
 * Campaign data repository.
 *
 * Each key in CAMPAIGNS maps directly to a campaign_id slug encoded in a
 * physical QR code. Replace placeholder values with real URLs before deploying.
 *
 * This module can be replaced with a fetch() call to the backend API at any
 * time without modifying any page or component (Open/Closed principle).
 */

import type { CampaignData } from "@/types/campaign";

/**
 * Static campaign registry.
 * Key: campaign_id slug (must match the value encoded in the physical QR code).
 */
const CAMPAIGNS: Record<string, CampaignData> = {
  "7fitment": {
    id: "7fitment",
    displayName: "7Fitment",
    bio: "Personalización y protección premium para tu auto. WRAP, Gráficos, Detailing y PPF con los mejores estándares del mercado.",
    avatarUrl: "/logo.jpg",
    links: [
      {
        id: "whatsapp",
        label: "Cotiza tu proyecto",
        href: "https://wa.me/525637940104?text=Hola%207Fitment,%20me%20interesa%20cotizar%20un%20proyecto%20para%20mi%20auto",
        icon: "MessageCircle",
        colorClass: "bg-green-500/10 hover:bg-green-500/20",
      },
      {
        id: "maps",
        label: "Visítanos en Satélite",
        href: "https://maps.app.goo.gl/yokwhFdPw2dJL5FWA",
        icon: "MapPin",
        colorClass: "bg-zinc-500/10 hover:bg-zinc-500/20",
      },
      {
        id: "instagram",
        label: "Seguinos en Instagram",
        href: "https://www.instagram.com/7fitment/",
        icon: "Instagram",
        colorClass: "bg-pink-500/10 hover:bg-pink-500/20",
      },
    ],
  },
};

/** Fallback campaign returned when a campaign_id is not found in the registry. */
const DEFAULT_CAMPAIGN: CampaignData = {
  id: "default",
  displayName: "QR-Hub",
  bio: "This QR code is not linked to any campaign.",
  links: [
    {
      id: "web",
      label: "Go to website",
      href: "https://tudominio.com",
      icon: "Globe",
    },
  ],
};

/**
 * Returns the campaign data for a given campaign_id.
 * Falls back to DEFAULT_CAMPAIGN if the ID is not registered.
 */
export function getCampaignData(campaignId: string): CampaignData {
  return CAMPAIGNS[campaignId] ?? { ...DEFAULT_CAMPAIGN, id: campaignId };
}
