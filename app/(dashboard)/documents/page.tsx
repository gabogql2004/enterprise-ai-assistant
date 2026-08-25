"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Documento {
  id: string;
  nombreArchivo: string;
  estado: string;
  chunks: number;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const puedeSubir = session?.user?.rol !== "viewer";

  const [documentos, setDocumentos] = useState<Documento[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function cargarDocumentos() {
    const res = await fetch("/api/documents");
    const json = await res.json();
    if (res.ok) setDocumentos(json.data);
  }

  useEffect(() => {
    (async () => {
      await cargarDocumentos();
    })();
  }, []);

  async function subirArchivo(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo subir el documento.");
        return;
      }
      cargarDocumentos();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        PDF y Word que el asistente usa como contexto para responder preguntas.
      </p>

      {puedeSubir && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const file = e.dataTransfer.files[0];
            if (file) subirArchivo(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mb-8 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
            arrastrando ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
            subiendo && "pointer-events-none opacity-60",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="size-5" />
          </span>
          <p className="text-sm font-medium">
            {subiendo ? "Subiendo y procesando..." : "Arrastra un archivo o haz clic para elegirlo"}
          </p>
          <p className="text-xs text-muted-foreground">PDF o Word (.docx), hasta 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subirArchivo(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {documentos === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : documentos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Todavía no hay documentos. {puedeSubir ? "Sube el primero arriba." : ""}
        </p>
      ) : (
        <Card className="py-2">
          <CardContent className="divide-y px-0">
            {documentos.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.nombreArchivo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()} · {d.chunks} {d.chunks === 1 ? "fragmento" : "fragmentos"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    d.estado === "procesado"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                      : ""
                  }
                >
                  {d.estado}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
