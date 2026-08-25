"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Miembro {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
}

const VARIANTE_ROL: Record<string, string> = {
  admin: "border-primary/30 bg-primary/10 text-primary",
  usuario: "border-border bg-muted text-foreground",
  viewer: "border-border bg-muted text-muted-foreground",
};

function iniciales(nombre: string) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TeamPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "admin";

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("usuario");
  const [error, setError] = useState<string | null>(null);
  const [invitando, setInvitando] = useState(false);

  async function cargarMiembros() {
    const res = await fetch("/api/team");
    const json = await res.json();
    if (res.ok) setMiembros(json.data);
  }

  useEffect(() => {
    (async () => {
      await cargarMiembros();
    })();
  }, []);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInvitando(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, rol }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo invitar al miembro.");
        return;
      }
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("usuario");
      cargarMiembros();
    } finally {
      setInvitando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {miembros.length} {miembros.length === 1 ? "miembro" : "miembros"} en tu organización.
        </p>
      </div>

      <Card className="py-2">
        <CardContent className="divide-y px-0">
          {miembros.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {iniciales(m.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <Badge variant="outline" className={`shrink-0 capitalize ${VARIANTE_ROL[m.rol] ?? ""}`}>
                {m.rol}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {esAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" />
              Invitar miembro
            </CardTitle>
            <CardDescription>Se crea una cuenta con el rol que elijas.</CardDescription>
          </CardHeader>
          <Separator className="mb-2" />
          <CardContent>
            <form onSubmit={invitar} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Contraseña temporal</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rol">Rol</Label>
                  <select
                    id="rol"
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="flex h-9 rounded-md border bg-background px-3 text-sm shadow-xs"
                  >
                    <option value="admin">admin</option>
                    <option value="usuario">usuario</option>
                    <option value="viewer">viewer</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={invitando} className="self-start">
                {invitando ? "Invitando..." : "Invitar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
