"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
}

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      setConversationId(json.data.conversationId);
      setMensajes((prev) => [
        ...prev,
        { rol: "assistant", contenido: json.data.mensaje },
      ]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-2xl flex-col p-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {mensajes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Escribe una pregunta para comenzar. (Sin contexto de documentos todavía — eso llega en Fase 2.)
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
  );
}
