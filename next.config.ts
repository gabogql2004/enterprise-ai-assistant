import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (vía pdfjs-dist) resuelve su worker dinámicamente en tiempo
  // de ejecución; si Turbopack lo empaqueta, esa resolución rompe.
  serverExternalPackages: ["pdf-parse"],
  // `next dev` reescribe CLAUDE.md en cada arranque para insertar su bloque
  // de agent-rules. Se observó más de una vez que, con varios reinicios
  // seguidos del dev server, esa reescritura truncaba el resto del archivo
  // (posible condición de carrera si un proceso anterior no terminó de
  // salir antes de que arrancara el siguiente). Se desactiva para no
  // arriesgar el contenido de este archivo.
  agentRules: false,
};

export default nextConfig;
