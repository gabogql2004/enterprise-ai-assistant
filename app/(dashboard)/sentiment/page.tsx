"use client";

import { useEffect, useState } from "react";
import { Frown, Meh, Smile as SmileIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Analisis {
  id: string;
  textoOriginal: string;
  sentimiento: "positivo" | "negativo" | "neutral";
  temas: string[];
  createdAt: string;
}

const CONFIG_SENTIMIENTO: Record<
  Analisis["sentimiento"],
  { icon: typeof SmileIcon; className: string }
> = {
  positivo: { icon: SmileIcon, className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400" },
  negativo: { icon: Frown, className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" },
  neutral: { icon: Meh, className: "border-border bg-muted text-muted-foreground" },
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
    (async () => {
      await cargarHistorial();
    })();
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
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Análisis de sentimiento</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Pega feedback de clientes y obtén sentimiento, temas y un resumen al instante.
      </p>

      <Card className="mb-8 py-4">
        <CardContent>
          <form onSubmit={analizar} className="flex gap-2">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega el feedback de un cliente..."
              disabled={analizando}
              className="h-11"
            />
            <Button type="submit" disabled={analizando || !texto.trim()} className="h-11 gap-2">
              <Sparkles className="size-4" />
              {analizando ? "Analizando..." : "Analizar"}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {resumen && (
            <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground">{resumen}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {historial.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay análisis. Prueba con el primero arriba.
          </p>
        )}
        {historial.map((a) => {
          const { icon: Icon, className } = CONFIG_SENTIMIENTO[a.sentimiento];
          return (
            <Card key={a.id} className="py-4 transition-shadow hover:shadow-sm">
              <CardContent className="flex items-start gap-4">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${className}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{a.textoOriginal}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge className={`capitalize ${className}`} variant="outline">
                      {a.sentimiento}
                    </Badge>
                    {a.temas.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
