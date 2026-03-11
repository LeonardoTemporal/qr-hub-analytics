/**
 * ProfileHeader – sección superior de la página de campaña.
 * Muestra avatar, nombre y bio del perfil.
 */

import Image from "next/image";

interface ProfileHeaderProps {
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export function ProfileHeader({ displayName, bio, avatarUrl }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-3 text-center px-4">
      {/* Avatar */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#0f0f0f]">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Avatar de ${displayName}`}
            fill
            sizes="80px"
            className="object-cover"
            priority
          />
        ) : (
          /* Placeholder generado con iniciales */
          <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-2xl font-bold select-none">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Nombre */}
      <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
        {displayName}
      </h1>

      {/* Bio */}
      {bio && (
        <p className="text-sm text-zinc-400 max-w-[280px] leading-relaxed">
          {bio}
        </p>
      )}
    </header>
  );
}
