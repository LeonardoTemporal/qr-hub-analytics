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
  "mi-negocio": {
    id: "mi-negocio",
    // TODO: Replace with the actual business display name.
    displayName: "Nombre del Negocio",
    // TODO: Replace with a short description visible below the avatar.
    bio: "Encontranos en nuestras redes o visitanos en la web.",
    links: [
      {
        id: "whatsapp",
        // TODO: Replace phone number and pre-filled message text.
        label: "Escribinos por WhatsApp",
        href: "https://wa.me/XXXXXXXXXXX?text=Hola%2C%20vi%20tu%20QR",
        icon: "MessageCircle",
        colorClass: "bg-green-500/10 hover:bg-green-500/20",
      },
      {
        id: "instagram",
        // TODO: Replace handle with the real Instagram username.
        label: "Seguinos en Instagram",
        href: "https://instagram.com/HANDLE",
        icon: "Instagram",
        colorClass: "bg-pink-500/10 hover:bg-pink-500/20",
      },
      {
        id: "website",
        // TODO: Replace with the real website URL.
        label: "Visitar sitio web",
        href: "https://tudominio.com",
        icon: "Globe",
        colorClass: "bg-indigo-500/10 hover:bg-indigo-500/20",
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
