"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Analisis {
  id: string;
  textoOriginal: string;
  sentimiento: "positivo" | "negativo" | "neutral";
  temas: string[];
  createdAt: string;
}

const COLOR_POR_SENTIMIENTO: Record<Analisis["sentimiento"], string> = {
  positivo: "text-green-600 dark:text-green-400",
  negativo: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
};

export default function SentimentPage() {
  const [texto, setTexto] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Analisis[]>([]);

  async function cargarHistorial() {
    const res = await fetch("/api/sentiment");
    const json = await res.json();
    if (res.ok) setHistorial(json.data);
  }

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || analizando) return;

    setError(null);
    setResumen(null);
    setAnalizando(true);
    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Ocurrió un error.");
        return;
      }
      setResumen(json.data.resumen);
      setTexto("");
      cargarHistorial();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Análisis de sentimiento</h1>

      <form onSubmit={analizar} className="mb-6 flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pega el feedback de un cliente..."
          disabled={analizando}
        />
        <Button type="submit" disabled={analizando || !texto.trim()}>
          {analizando ? "Analizando..." : "Analizar"}
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {resumen && (
        <p className="mb-6 rounded-md bg-muted p-3 text-sm">{resumen}</p>
      )}

      <div className="space-y-3">
        {historial.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <p className="text-sm">{a.textoOriginal}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-medium capitalize ${COLOR_POR_SENTIMIENTO[a.sentimiento]}`}>
                  {a.sentimiento}
                </span>
                {a.temas.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
