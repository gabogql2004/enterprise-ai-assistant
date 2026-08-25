"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
}

interface ConversacionResumen {
  id: string;
  titulo: string | null;
  createdAt: string;
}

export default function ChatPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarConversaciones() {
    const res = await fetch("/api/chat/conversations");
    const json = await res.json();
    if (res.ok) setConversaciones(json.data);
  }

  useEffect(() => {
    (async () => {
      await cargarConversaciones();
    })();
  }, []);

  async function abrirConversacion(id: string) {
    setError(null);
    const res = await fetch(`/api/chat/conversations/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar la conversación.");
      return;
    }
    setConversationId(json.data.id);
    setMensajes(json.data.messages);
  }

  function nuevaConversacion() {
    setConversationId(null);
    setMensajes([]);
    setError(null);
  }

  async function enviarMensaje(e: React.FormEvent) {
    e.preventDefault();
    const mensaje = input.trim();
    if (!mensaje || cargando) return;

    setError(null);
    setMensajes((prev) => [...prev, { rol: "user", contenido: mensaje }]);
    setInput("");
    setCargando(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, mensaje }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Ocurrió un error.");
        return;
      }

      const esConversacionNueva = !conversationId;
      setConversationId(json.data.conversationId);
      setMensajes((prev) => [
        ...prev,
        { rol: "assistant", contenido: json.data.mensaje },
      ]);
      if (esConversacionNueva) cargarConversaciones();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/30 sm:flex">
        <div className="p-3">
          <Button variant="outline" size="sm" onClick={nuevaConversacion} className="w-full justify-start gap-2">
            <Plus className="size-4" />
            Nueva conversación
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {conversaciones.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              Tu historial de conversaciones aparecerá acá.
            </p>
          )}
          {conversaciones.map((c) => (
            <button
              key={c.id}
              onClick={() => abrirConversacion(c.id)}
              className={cn(
                "w-full truncate rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                c.id === conversationId
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {c.titulo || "Sin título"}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            {mensajes.length === 0 && (
              <div className="flex flex-col items-center gap-3 pt-24 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-6" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Escribe una pregunta para comenzar. El asistente responde con base en los
                  documentos de tu organización.
                </p>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={cn("flex items-start gap-3", m.rol === "user" && "flex-row-reverse")}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium",
                      m.rol === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {m.rol === "assistant" ? <Sparkles className="size-4" /> : "Tú"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    m.rol === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card",
                  )}
                >
                  {m.rol === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.contenido}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.contenido}</p>
                  )}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex items-center gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1 rounded-2xl border bg-card px-4 py-3">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl">
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            <form onSubmit={enviarMensaje} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                disabled={cargando}
                className="h-11"
              />
              <Button type="submit" disabled={cargando || !input.trim()} size="icon" className="size-11 shrink-0">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
