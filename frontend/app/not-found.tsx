import Link from "next/link";

/**
 * Página 404 – No encontrado
 *
 * Se muestra cuando el usuario accede a una ruta que no existe.
 * Ofrece un botón para volver a /enlaces.
 */
export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-8">
        {/* Icono 404 */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center ring-2 ring-indigo-600/30 ring-offset-4 ring-offset-[#0f0f0f]">
            <span className="text-6xl font-bold text-white">404</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Página no encontrada
          </h1>
          <p className="text-lg text-zinc-400 max-w-md">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>

        {/* Botón de acción */}
        <Link
          href="/enlaces"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/25 active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver a enlaces</span>
        </Link>

        {/* Footer */}
        <footer className="text-center mt-8">
          <p className="text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
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
