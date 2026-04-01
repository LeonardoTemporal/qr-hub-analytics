/**
 * ProfileHeader - Seccion superior premium
 *
 * Estetica Luxury Automotive (Porsche/Apple)
 * Avatar con glassmorphism sutil y animaciones fluidas
 * Totalmente responsive
 */

"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface ProfileHeaderProps {
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export function ProfileHeader({ displayName, bio, avatarUrl }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-5 sm:gap-6 text-center px-2">
      {/* Avatar Container with Premium Ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-1 ring-white/20 ring-offset-4 ring-offset-black shadow-2xl">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`Avatar de ${displayName}`}
              fill
              sizes="(max-width: 640px) 112px, 128px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white text-black text-3xl sm:text-4xl font-bold select-none">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 -z-10 blur-2xl opacity-15 bg-white rounded-full scale-150" />
      </motion.div>

      {/* Display Name with Gradient */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        className="text-2xl sm:text-3xl font-light text-white tracking-tight leading-tight"
      >
        <span className="gradient-text font-medium">{displayName}</span>
      </motion.h1>

      {/* Bio */}
      {bio && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-zinc-500 max-w-[300px] leading-relaxed"
        >
          {bio}
        </motion.p>
      )}
    </header>
  );
}
