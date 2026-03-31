/**
 * Página dinámica de campaña – App Router Next.js 14+
 *
 * Ruta: /enlaces/{campaign_id}
 * Esta es la pantalla donde aterriza el usuario después del 302 redirect
 * del backend FastAPI.
 *
 * Arquitectura:
 * - Server Component (RSC) por defecto → SEO y performance óptimos.
 * - GA4PageView es un Client Component mínimo que dispara el evento
 *   page_view sin bloquear el renderizado del servidor.
 */

import type { Metadata } from "next";
import { getCampaignData } from "@/lib/campaigns";
import { ProfileHeader } from "@/components/ProfileHeader";
import { LinkCard } from "@/components/LinkCard";
import { GA4PageView } from "@/components/GA4PageView";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de Next.js App Router
// ─────────────────────────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ campaign_id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata dinámica (Open Graph por campaña)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaign_id } = await params;
  const campaign = getCampaignData(campaign_id);

  return {
    title: `${campaign.displayName} | QR-Hub`,
    description: campaign.bio,
    openGraph: {
      title: campaign.displayName,
      description: campaign.bio,
      type: "website",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────
export default async function CampaignPage({ params }: PageProps) {
  const { campaign_id } = await params;
  const campaign = getCampaignData(campaign_id);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-start bg-[#0f0f0f] px-4 py-12">
      {/* Evento GA4 (Client Component sin UI) */}
      <GA4PageView campaignId={campaign_id} />

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
