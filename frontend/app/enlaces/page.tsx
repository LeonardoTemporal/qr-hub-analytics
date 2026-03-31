/**
 * Página estática de enlaces – 7Fitment
 *
 * Esta página muestra SIEMPRE los enlaces de la campaña "7fitment".
 * No depende de la URL, el campaign_id está definido internamente.
 *
 * Ruta: /enlaces
 */

import type { Metadata } from "next";
import { getCampaignData } from "@/lib/campaigns";
import { ProfileHeader } from "@/components/ProfileHeader";
import { LinkCard } from "@/components/LinkCard";
import { GA4PageView } from "@/components/GA4PageView";

// Campaign ID hardcoded - siempre muestra los links de Leslye
const CAMPAIGN_ID = "7fitment";

// ─────────────────────────────────────────────────────────────────────────────
// Metadata estática
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata(): Promise<Metadata> {
  const campaign = getCampaignData(CAMPAIGN_ID);

  return {
    title: `${campaign.displayName} | QR-Hub`,
    description: campaign.bio,
    openGraph: {
      title: campaign.displayName,
      description: campaign.bio,
      type: "website",
      url: `https://7fitment.com/enlaces`,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────
export default async function EnlacesPage() {
  const campaign = getCampaignData(CAMPAIGN_ID);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-start bg-[#0f0f0f] px-4 py-12">
      {/* Evento GA4 (Client Component sin UI) */}
      <GA4PageView campaignId={CAMPAIGN_ID} />

      {/* Contenedor centrado Mobile-First, max ~400 px en desktop */}
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* ── Cabecera de perfil ─────────────────────────────────── */}
        <ProfileHeader
          displayName={campaign.displayName}
          bio={campaign.bio}
          avatarUrl={campaign.avatarUrl}
        />

        {/* ── Lista de enlaces ───────────────────────────────────── */}
        <nav aria-label={`Enlaces de ${campaign.displayName}`}>
          <ul className="flex flex-col gap-3">
            {campaign.links.map((link) => (
              <li key={link.id}>
                <LinkCard link={link} />
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Footer minimalista ─────────────────────────────────── */}
        <footer className="text-center mt-4">
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
            {" "}|{" "}
            <span className="text-zinc-500 font-medium">by HellSpawn</span>
          </p>
        </footer>
      </div>

      {/* Gradiente decorativo de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>
    </main>
  );
}
