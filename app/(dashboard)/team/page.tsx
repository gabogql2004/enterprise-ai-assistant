"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Miembro {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
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
    cargarMiembros();
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
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Equipo</h1>

      <Card>
        <CardContent className="divide-y pt-4">
          {miembros.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium">{m.nombre}</p>
                <p className="text-muted-foreground">{m.email}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{m.rol}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {esAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitar miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invitar} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
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
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="admin">admin</option>
                  <option value="usuario">usuario</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={invitando}>
                {invitando ? "Invitando..." : "Invitar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
