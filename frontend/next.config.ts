import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * output: "standalone" genera una carpeta .next/standalone autocontenida
   * con sólo las dependencias necesarias en producción.
   * Esto reduce drásticamente el tamaño de la imagen Docker final.
   */
  output: "standalone",

  /**
   * Variables de entorno expuestas al cliente (NEXT_PUBLIC_*).
   * Se inyectan en build-time; para runtime dinámico se debe usar
   * el patrón de env vars en Docker Compose / Dokploy.
   */
  env: {
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID ?? "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
  },
};

export default nextConfig;
