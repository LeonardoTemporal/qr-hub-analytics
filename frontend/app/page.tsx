import Link from "next/link";

/**
 * Ruta raíz – Página "En construcción"
 *
 * Muestra un mensaje temporal mientras se desarrolla el sitio web principal.
 * Incluye un enlace discreto a /enlaces para acceder al linktree de campaña.
 */
export default function RootPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-8">
        {/* Logo/Avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-indigo-600/20 ring-offset-2 ring-offset-[#0f0f0f]">
          <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-4xl font-bold">
            7F
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            7Fitment
          </h1>
          <p className="text-lg text-zinc-400 max-w-md">
            Transforma tu cuerpo, transforma tu vida
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-sm text-amber-400 font-medium">
              Sitio web en construcción
            </span>
          </div>
        </div>

        {/* Enlace a /enlaces */}
        <Link
          href="/enlaces"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:border-white/25 hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Ver enlaces y contacto</span>
        </Link>

        {/* Footer */}
        <footer className="text-center mt-8">
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
            {" "}|{" "}
            <span className="text-zinc-500 font-medium">by HellSpawn</span>
          </p>
        </footer>
      </div>

      {/* Gradiente decorativo de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>
    </main>
  );
}
