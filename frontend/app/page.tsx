/**
 * Ruta raiz - Pagina "En construccion"
 *
 * Estetica Luxury Automotive (estilo Porsche/Apple)
 * Muestra un mensaje temporal mientras se desarrolla el sitio web principal.
 * Incluye un enlace discreto a /enlaces para acceder al linktree de campana.
 */

import Link from "next/link";

export default function RootPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-black px-4 sm:px-6">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-10 sm:gap-12">
        
        {/* Logo/Avatar - Luxury White Circle */}
        <div className="relative">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-1 ring-white/20 ring-offset-4 ring-offset-black shadow-2xl">
            <div className="w-full h-full flex items-center justify-center bg-white text-black text-3xl sm:text-4xl font-bold tracking-tighter select-none">
              7F
            </div>
          </div>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 -z-10 blur-2xl opacity-20 bg-white rounded-full scale-150" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 sm:gap-6">
          <h1 className="text-4xl sm:text-5xl font-light text-white tracking-tight">
            <span className="gradient-text font-medium">7Fitment</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Taller de personalizacion automotriz de ultralujo, PPF y Detailing
          </p>
          
          {/* Status Badge */}
          <div className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-sm text-zinc-400 font-medium tracking-wide">
              Sitio web en construccion
            </span>
          </div>
        </div>

        {/* CTA Button - Premium White */}
        <Link
          href="/enlaces"
          className="group inline-flex items-center gap-3 px-7 py-4 rounded-2xl bg-white hover:bg-zinc-100 text-black font-medium text-sm sm:text-base transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] shadow-lg"
        >
          <svg 
            className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
            />
          </svg>
          <span>Ver enlaces y contacto</span>
          <svg 
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 opacity-60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Footer */}
        <footer className="text-center mt-4 sm:mt-8">
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500">QR-Hub Analytics</span>
            {" | "}
            <span className="gradient-text">by HellSpawn</span>
          </p>
        </footer>
      </div>

      {/* Background Gradient - Subtle White */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-white/[0.02] blur-[100px] sm:blur-[150px]" />
        <div className="absolute -bottom-40 right-1/4 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-white/[0.01] blur-[80px] sm:blur-[120px]" />
      </div>
    </main>
  );
}
