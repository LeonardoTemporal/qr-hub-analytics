/**
 * DashboardLoginForm - Secure login page
 * 
 * Premium login experience with strict 3-block flex layout
 * Luxury automotive aesthetic with massive breathing room
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";

interface DashboardLoginFormProps {
  onLogin: () => void;
  masterPassword: string;
}

export function DashboardLoginForm({ onLogin, masterPassword }: DashboardLoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    setTimeout(() => {
      if (password === masterPassword) {
        onLogin();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-black flex flex-col"
    >
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-white/[0.02] blur-[120px] sm:blur-[150px]" />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BLOCK 1: HEADER SPACER
          - Empty spacer for visual balance at top
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 h-16 sm:h-20 lg:h-24" aria-hidden="true" />

      {/* ════════════════════════════════════════════════════════════════════
          BLOCK 2: MAIN CONTENT (flex-grow)
          - Centered login form with massive vertical spacing
          - Content uses flex-grow to fill available space
      ════════════════════════════════════════════════════════════════════ */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
          className="w-full max-w-md lg:max-w-lg flex flex-col gap-10 sm:gap-12 lg:gap-16"
        >
          
          {/* Brand Section - Logo and Title */}
          <section className="text-center space-y-6 sm:space-y-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="relative inline-block"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden ring-1 ring-white/10 ring-offset-4 ring-offset-black shadow-2xl">
                <Image
                  src="/logo.jpg"
                  alt="7Fitment Logo"
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, 112px"
                  className="object-cover"
                  priority
                />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-white rounded-full scale-150" />
            </motion.div>

            <div className="space-y-3 sm:space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight"
              >
                <span className="gradient-text font-medium">7Fitment</span> Analytics
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm sm:text-base text-zinc-500 tracking-wide"
              >
                Dashboard de Metricas Premium
              </motion.p>
            </div>
          </section>

          {/* Login Card Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl space-y-6 sm:space-y-8"
          >
            {/* Card Header */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                className="flex-shrink-0 p-3 sm:p-3.5 bg-white/[0.05] rounded-xl"
              >
                <Lock size={20} className="text-zinc-400 sm:w-6 sm:h-6" strokeWidth={1.5} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-medium text-white truncate">
                  Acceso Seguro
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Ingresa tu clave para continuar
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2.5"
              >
                <label className="block text-xs sm:text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  Clave de Acceso
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave"
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-300 hover:bg-white/[0.05] text-sm sm:text-base"
                  autoFocus
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 sm:px-5 py-3.5 sm:py-4"
                  >
                    <p className="text-xs sm:text-sm text-red-400 text-center">
                      Clave incorrecta. Intenta de nuevo.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading || !password}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 sm:py-4 bg-white hover:bg-zinc-100 text-black font-medium rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 text-sm sm:text-base"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full"
                  />
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight size={18} strokeWidth={2} />
                  </>
                )}
              </motion.button>
            </form>
          </motion.section>

        </motion.div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          BLOCK 3: FOOTER (flex-shrink-0)
          - Always anchored at bottom with proper spacing
      ════════════════════════════════════════════════════════════════════ */}
      <footer className="flex-shrink-0 py-8 sm:py-10 border-t border-white/[0.03]">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-[10px] sm:text-xs text-zinc-600 select-none"
        >
          Powered by{" "}
          <span className="text-zinc-500">QR-Hub Analytics</span>
          {" | "}
          <span className="gradient-text">by HellSpawn</span>
        </motion.p>
      </footer>
    </motion.div>
  );
}
