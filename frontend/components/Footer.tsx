/**
 * Footer - Consistent footer across pages
 * 
 * Minimalist branding footer
 */

"use client";

import { motion } from "framer-motion";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className={`py-6 sm:py-8 text-center ${className}`}
    >
      <p className="text-[10px] sm:text-xs text-zinc-600 select-none">
        Powered by{" "}
        <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
        {" | "}
        <span className="gradient-text font-medium">by HellSpawn</span>
      </p>
    </motion.footer>
  );
}
