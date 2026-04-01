/**
 * DashboardKPICard - Premium KPI display card
 * 
 * Glassmorphism card with animated number counter
 * Luxury automotive aesthetic
 */

"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { animate } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

// Animation variants
const cardVariants = {
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

// Animated number counter
function AnimatedNumber({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.5,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (latest) => {
        node.textContent = Math.round(latest).toString();
      },
    });

    return controls.stop;
  }, [value]);

  return <span ref={nodeRef}>0</span>;
}

interface DashboardKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  iconBgClass?: string;
  index?: number;
}

export function DashboardKPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  iconBgClass = "bg-white",
  index = 0 
}: DashboardKPICardProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-500 cursor-pointer overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-[0.2em] font-medium mb-3">
            {title}
          </p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight"
          >
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
          </motion.p>
          {trend && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="text-xs text-emerald-400/80 mt-4 flex items-center gap-1 font-medium"
            >
              <ArrowUpRight size={12} strokeWidth={2.5} />
              {trend}
            </motion.p>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className={`p-3 sm:p-4 rounded-xl ${iconBgClass} group-hover:scale-105 transition-transform duration-300 shadow-lg`}
        >
          <Icon size={20} className="text-black sm:w-6 sm:h-6" strokeWidth={1.5} />
        </motion.div>
      </div>
    </motion.div>
  );
}
