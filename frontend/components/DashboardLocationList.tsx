/**
 * DashboardLocationList - Geographic data display
 * 
 * Progress bars for location-based metrics
 * Luxury automotive aesthetic
 */

"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface LocationData {
  name: string;
  value: number;
}

interface DashboardLocationListProps {
  title: string;
  icon: LucideIcon;
  locations: LocationData[];
}

export function DashboardLocationList({ 
  title, 
  icon: Icon, 
  locations 
}: DashboardLocationListProps) {
  const maxValue = Math.max(...locations.map((l) => l.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-6 lg:p-8 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/[0.05]">
          <Icon size={16} className="text-zinc-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-medium text-zinc-300 tracking-tight">{title}</h3>
      </div>
      
      <div className="space-y-4">
        {locations.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">Sin datos disponibles</p>
        ) : (
          locations.map((location, index) => (
            <motion.div
              key={location.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors truncate pr-2">
                  {location.name}
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
                  className="text-xs sm:text-sm font-medium text-white tabular-nums"
                >
                  {location.value}
                </motion.span>
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.05 + 0.15, duration: 0.6 }}
                className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden"
                style={{ transformOrigin: "left" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(location.value / maxValue) * 100}%` }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-white via-zinc-300 to-zinc-500 rounded-full"
                />
              </motion.div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
