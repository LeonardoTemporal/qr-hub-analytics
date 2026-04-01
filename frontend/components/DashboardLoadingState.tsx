/**
 * DashboardLoadingState - Loading indicator
 * 
 * Full-page loading state with animation
 */

"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export function DashboardLoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative mb-6"
        >
          <Activity className="text-white" size={32} strokeWidth={1.5} />
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-white/20"
          />
        </motion.div>
        <p className="text-zinc-500 text-sm tracking-wide">Cargando analiticas...</p>
      </motion.div>
    </div>
  );
}
