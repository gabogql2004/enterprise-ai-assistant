import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class FormatoNoSoportadoError extends Error {}

// pdf-parse v2 y mammoth tienen APIs distintas entre sí (una basada en
// clases con .destroy(), la otra en funciones puras) — esta función unifica
// ambas detrás de una sola interfaz para el endpoint de upload.
export async function extraerTexto(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const resultado = await parser.getText();
      return resultado.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const resultado = await mammoth.extractRawText({ buffer });
    return resultado.value;
  }

  throw new FormatoNoSoportadoError(`Formato no soportado: ${mimeType}`);
}
