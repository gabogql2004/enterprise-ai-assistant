"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Gestiona el plan de tu organización.
      </p>

      {!billing ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {billing.plan === "pro" ? <Sparkles className="size-5" /> : <CreditCard className="size-5" />}
              </span>
              <div>
                <CardTitle className="text-lg capitalize">Plan {billing.plan}</CardTitle>
                {billing.subscription && (
                  <p className="text-sm text-muted-foreground">
                    Renueva el {new Date(billing.subscription.periodoFin).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {billing.subscription && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 capitalize text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              >
                {billing.subscription.estado}
              </Badge>
            )}
          </div>

          <CardContent className="space-y-4 p-6">
            <ul className="space-y-2 text-sm">
              {billing.plan === "free" && billing.limites ? (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-muted-foreground" />
                    Hasta {billing.limites.documentos} documentos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-muted-foreground" />
                    {billing.limites.mensajesPorMes} mensajes de chat al mes
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    Documentos ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    Mensajes de chat ilimitados
                  </li>
                </>
              )}
            </ul>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {billing.plan === "free" ? (
              <Button onClick={iniciarCheckout} disabled={cargando} className="gap-2">
                <Sparkles className="size-4" />
                Actualizar a Pro — $29/mes
              </Button>
            ) : (
              <Button variant="outline" onClick={abrirPortal} disabled={cargando}>
                Gestionar suscripción
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
