"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Billing {
  plan: "free" | "pro";
  limites: { documentos: number; mensajesPorMes: number } | null;
  subscription: { estado: string; periodoFin: string } | null;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => res.json())
      .then((json) => setBilling(json.data));
  }, []);

  async function iniciarCheckout() {
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo iniciar el checkout.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setCargando(false);
    }
  }

  async function abrirPortal() {
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo abrir el portal de facturación.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setCargando(false);
    }
  }

  if (!billing) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Facturación</h1>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Plan {billing.plan}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {billing.plan === "free" && billing.limites && (
            <p className="text-sm text-muted-foreground">
              Hasta {billing.limites.documentos} documentos y {billing.limites.mensajesPorMes} mensajes de chat al mes.
            </p>
          )}
          {billing.subscription && (
            <p className="text-sm text-muted-foreground">
              Estado: {billing.subscription.estado} · Renueva:{" "}
              {new Date(billing.subscription.periodoFin).toLocaleDateString()}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {billing.plan === "free" ? (
            <Button onClick={iniciarCheckout} disabled={cargando}>
              Actualizar a Pro — $29/mes
            </Button>
          ) : (
            <Button variant="outline" onClick={abrirPortal} disabled={cargando}>
              Gestionar suscripción
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
