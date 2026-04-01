/**
 * DashboardLoginForm - Secure login page
 * 
 * Premium login experience with glassmorphism
 * Luxury automotive aesthetic
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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.05, y: -20 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6"
    >
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[150px]" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
        className="w-full max-w-sm sm:max-w-md"
      >
        {/* Logo and Brand */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-white/10 ring-offset-4 ring-offset-black mb-6 shadow-2xl relative"
          >
            <Image
              src="/logo.jpg"
              alt="7Fitment Logo"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-light text-white mb-2 tracking-tight"
          >
            <span className="gradient-text font-medium">7Fitment</span> Analytics
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs sm:text-sm text-zinc-500 tracking-wide"
          >
            Dashboard de Metricas Premium
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
              className="p-2.5 sm:p-3 bg-white/[0.05] rounded-xl"
            >
              <Lock size={18} className="text-zinc-400 sm:w-5 sm:h-5" strokeWidth={1.5} />
            </motion.div>
            <div>
              <h2 className="text-base sm:text-lg font-medium text-white">Acceso Seguro</h2>
              <p className="text-[10px] sm:text-xs text-zinc-500">Ingresa tu clave para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Clave de Acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu clave"
                className="w-full px-4 py-3 sm:py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-300 hover:bg-white/[0.05] text-sm"
                autoFocus
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
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
              className="w-full py-3 sm:py-3.5 bg-white hover:bg-zinc-100 text-black font-medium rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                />
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 sm:mt-8 pt-6 border-t border-white/[0.05] text-center"
          >
            <p className="text-[10px] sm:text-xs text-zinc-600">
              Powered by{" "}
              <span className="text-zinc-500">QR-Hub Analytics</span>
              {" | "}
              <span className="gradient-text">by HellSpawn</span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
