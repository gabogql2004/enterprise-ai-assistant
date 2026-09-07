import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (vía pdfjs-dist) resuelve su worker dinámicamente en tiempo
  // de ejecución; si Turbopack lo empaqueta, esa resolución rompe.
  // @napi-rs/canvas es un módulo nativo (binario prebuildeado) que pdfjs-dist
  // usa para polyfillear DOMMatrix en Node — sin marcarlo external, Vercel
  // falla en runtime con "DOMMatrix is not defined" al extraer PDFs.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  // pdfjs-dist hace un require() dinámico de @napi-rs/canvas dentro de un
  // try/catch — el output file tracing de Vercel no lo detecta por análisis
  // estático y no copia el módulo (ni su binario nativo) a la función
  // serverless. Se incluye explícitamente para /api/documents.
  outputFileTracingIncludes: {
    "/api/documents": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/pdfjs-dist/**",
    ],
  },
  // `next dev` reescribe CLAUDE.md en cada arranque para insertar su bloque
  // de agent-rules. Se observó más de una vez que, con varios reinicios
  // seguidos del dev server, esa reescritura truncaba el resto del archivo
  // (posible condición de carrera si un proceso anterior no terminó de
  // salir antes de que arrancara el siguiente). Se desactiva para no
  // arriesgar el contenido de este archivo.
  agentRules: false,
};

export default nextConfig;
