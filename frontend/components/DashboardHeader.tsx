/**
 * DashboardHeader - Premium navigation header
 * 
 * Sticky header with scroll-aware background
 * Luxury automotive aesthetic
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

interface DashboardHeaderProps {
  ownerName: string;
  onLogout: () => void;
}

export function DashboardHeader({ ownerName, onLogout }: DashboardHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/60 backdrop-blur-2xl border-b border-white/[0.05] shadow-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left Side - Logo and Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="hidden sm:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg"
            >
              <span className="text-sm sm:text-base font-bold text-black tracking-tight">7F</span>
            </motion.div>
            <div className="min-w-0">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm sm:text-base font-medium text-white truncate"
              >
                Hola, <span className="gradient-text">{ownerName}</span>
              </motion.h1>
              <p className="text-[10px] sm:text-xs text-zinc-500 tracking-wide">
                Panel de Analiticas
              </p>
            </div>
          </div>

          {/* Right Side - Logout Button */}
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-zinc-400 hover:text-white transition-all duration-300 text-sm"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline font-medium">Salir</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
