/**
 * DashboardErrorState - Error display
 * 
 * Error page with retry action
 */

"use client";

import { motion } from "framer-motion";
import { BarChart3, ArrowLeft } from "lucide-react";

interface DashboardErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <BarChart3 className="text-zinc-400" size={32} strokeWidth={1.5} />
          </div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-medium text-white mb-3"
        >
          Error al cargar datos
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-zinc-500 mb-6 leading-relaxed"
        >
          {error || "No se pudieron cargar los datos de analiticas"}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-zinc-300 hover:text-white transition-all duration-300 text-sm font-medium"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Volver al inicio</span>
        </motion.button>
      </div>
    </div>
  );
}
