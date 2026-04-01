/**
 * Pagina estatica de enlaces - 7Fitment
 *
 * Premium Luxury Automotive aesthetic (Porsche/Apple style)
 * Glassmorphism con animaciones fluidas
 * Totalmente responsive (mobile-first)
 * Ruta: /enlaces
 */

"use client";

import { getCampaignData } from "@/lib/campaigns";
import { ProfileHeader } from "@/components/ProfileHeader";
import { LinkCard } from "@/components/LinkCard";
import { GA4PageView } from "@/components/GA4PageView";
import { motion } from "framer-motion";

const CAMPAIGN_ID = "7fitment";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
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

export default async function EnlacesPage() {
  const campaign = getCampaignData(CAMPAIGN_ID);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-start px-4 sm:px-6 py-12 sm:py-16">
      {/* GA4 Event Tracker */}
      <GA4PageView campaignId={CAMPAIGN_ID} />

      {/* Main Container - Mobile-First */}
      <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-8 sm:gap-10 flex-grow">
        
        {/* Profile Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <ProfileHeader
            displayName={campaign.displayName}
            bio={campaign.bio}
            avatarUrl={campaign.avatarUrl}
          />
        </motion.div>

        {/* Links Section with Stagger Animation */}
        <motion.nav
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-label={`Enlaces de ${campaign.displayName}`}
          className="flex flex-col gap-3 sm:gap-4"
        >
          {campaign.links.map((link) => (
            <motion.div key={link.id} variants={itemVariants}>
              <LinkCard link={link} />
            </motion.div>
          ))}
        </motion.nav>

        {/* Footer - Minimal */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-auto pt-8 sm:pt-12"
        >
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500">QR-Hub Analytics</span>
            {" | "}
            <span className="gradient-text">by HellSpawn</span>
          </p>
        </motion.footer>
      </div>

      {/* Background Gradients - Subtle White */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-white/[0.03] blur-[100px] sm:blur-[120px]" />
        <div className="absolute -bottom-20 right-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-white/[0.02] blur-[80px]" />
      </div>
    </main>
  );
}
