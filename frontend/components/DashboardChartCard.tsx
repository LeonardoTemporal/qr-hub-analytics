/**
 * DashboardChartCard - Wrapper for chart components
 * 
 * Glassmorphism card optimized for Recharts
 * Luxury automotive aesthetic
 */

"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface DashboardChartCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function DashboardChartCard({ 
  title, 
  icon: Icon, 
  children,
  className = ""
}: DashboardChartCardProps) {
  return (
    <div 
      className={`bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-6 lg:p-8 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500 ${className}`}
    >
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 5 }}
          className="p-2 rounded-lg bg-white/[0.05]"
        >
          <Icon size={18} className="text-zinc-400" strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}
