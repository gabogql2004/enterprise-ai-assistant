// Divide el texto en chunks solapados para el pipeline RAG. No usamos un
// tokenizer real (evita otra dependencia pesada): aproximamos 1 token ≈
// 0.75 palabras, así que 500 tokens ≈ 375 palabras. El overlap conserva
// contexto entre chunks consecutivos para no cortar ideas a la mitad.
const PALABRAS_POR_CHUNK = 375;
const PALABRAS_DE_OVERLAP = 50;

export function dividirEnChunks(texto: string): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];

  const chunks: string[] = [];
  let inicio = 0;

  while (inicio < palabras.length) {
    const fin = Math.min(inicio + PALABRAS_POR_CHUNK, palabras.length);
    chunks.push(palabras.slice(inicio, fin).join(" "));

    if (fin === palabras.length) break;
    inicio = fin - PALABRAS_DE_OVERLAP;
  }

  return chunks;
}
