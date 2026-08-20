"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    cargarConversaciones();
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
    <div className="flex h-[calc(100vh-57px)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r p-3 sm:flex">
        <Button variant="outline" size="sm" onClick={nuevaConversacion} className="mb-3">
          + Nueva conversación
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversaciones.map((c) => (
            <button
              key={c.id}
              onClick={() => abrirConversacion(c.id)}
              className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                c.id === conversationId ? "bg-muted font-medium" : "text-muted-foreground"
              }`}
            >
              {c.titulo || "Sin título"}
            </button>
          ))}
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-2xl flex-col p-4">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {mensajes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Escribe una pregunta para comenzar. El asistente responde con base en los documentos de tu organización.
            </p>
          )}
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                m.rol === "user"
                  ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                  : "mr-auto max-w-[80%] bg-muted"
              }`}
            >
              {m.contenido}
            </div>
          ))}
          {cargando && (
            <p className="mr-auto text-sm text-muted-foreground">Pensando...</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <form onSubmit={enviarMensaje} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={cargando}
          />
          <Button type="submit" disabled={cargando || !input.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}
