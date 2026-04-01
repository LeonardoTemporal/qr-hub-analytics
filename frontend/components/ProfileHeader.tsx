/**
 * ProfileHeader – sección superior premium black/white
 *
 * Avatar con glassmorphism y animaciones
 */

import Image from "next/image";
import { motion } from "framer-motion";

interface ProfileHeaderProps {
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export function ProfileHeader({ displayName, bio, avatarUrl }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4 text-center px-4">
      {/* Avatar con glassmorphism premium */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/20 ring-offset-4 ring-offset-black"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Avatar de ${displayName}`}
            fill
            sizes="96px"
            className="object-cover"
            priority
          />
        ) : (
          /* Placeholder generado con iniciales - white/black */
          <div className="w-full h-full flex items-center justify-center bg-white text-black text-2xl font-bold select-none">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </motion.div>

      {/* Nombre con gradient text */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        className="text-2xl font-bold text-white tracking-tight leading-tight"
      >
        <span className="gradient-text">{displayName}</span>
      </motion.h1>

      {/* Bio */}
      {bio && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-zinc-400 max-w-[280px] leading-relaxed"
        >
          {bio}
        </motion.p>
      )}
    </header>
  );
}
