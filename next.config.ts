import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (vía pdfjs-dist) resuelve su worker dinámicamente en tiempo
  // de ejecución; si Turbopack lo empaqueta, esa resolución rompe.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
