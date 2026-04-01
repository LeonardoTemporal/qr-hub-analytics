/**
 * Página estática de enlaces – 7Fitment
 *
 * Premium black/white aesthetic con glassmorphism
 * Ruta: /enlaces
 */

"use client";

import { getCampaignData } from "@/lib/campaigns";
import { ProfileHeader } from "@/components/ProfileHeader";
import { LinkCard } from "@/components/LinkCard";
import { GA4PageView } from "@/components/GA4PageView";
import { motion } from "framer-motion";

// Campaign ID hardcoded - siempre muestra los links de Leslye
const CAMPAIGN_ID = "7fitment";

// ─────────────────────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────
export default async function EnlacesPage() {
  const campaign = getCampaignData(CAMPAIGN_ID);

  return (
    <main className="min-h-screen bg-black/90 flex flex-col items-center justify-start px-4 py-12">
      {/* Evento GA4 (Client Component sin UI) */}
      <GA4PageView campaignId={CAMPAIGN_ID} />

      {/* Contenedor centrado Mobile-First con flex layout */}
      <div className="w-full max-w-sm flex flex-col gap-8 flex-grow">
        {/* ── Cabecera de perfil ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ProfileHeader
            displayName={campaign.displayName}
            bio={campaign.bio}
            avatarUrl={campaign.avatarUrl}
          />
        </motion.div>

        {/* ── Lista de enlaces con stagger animations ───────────── */}
        <motion.nav
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-label={`Enlaces de ${campaign.displayName}`}
          className="flex flex-col gap-4"
        >
          {campaign.links.map((link, index) => (
            <motion.div
              key={link.id}
              variants={itemVariants}
            >
              <LinkCard link={link} />
            </motion.div>
          ))}
        </motion.nav>

        {/* ── Footer minimalista ─────────────────────────────────── */}
        <footer className="text-center mt-auto pt-8">
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
            {" | "}
            <span className="gradient-text font-medium">by HellSpawn</span>
          </p>
        </footer>
      </div>

      {/* Gradiente decorativo de fondo - sutil blanco/negro */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-[120px]" />
      </div>
    </main>
  );
}
