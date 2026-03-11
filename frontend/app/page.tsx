import { redirect } from "next/navigation";

/**
 * Ruta raíz – redirige a la campaña demo.
 * En producción puedes cambiar esto a una landing page institucional,
 * documentación pública o simplemente mostrar un 404.
 */
export default function RootPage() {
  redirect("/mi-negocio");
}
 
