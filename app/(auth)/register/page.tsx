"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [nombreOrganizacion, setNombreOrganizacion] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreOrganizacion, nombre, email, password }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la cuenta.");
      setCargando(false);
      return;
    }

    const resultado = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setCargando(false);

    if (resultado?.error) {
      setError("Cuenta creada, pero no se pudo iniciar sesión automáticamente. Intenta ingresar.");
      router.push("/login");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crea tu organización</CardTitle>
          <CardDescription>
            Se te asignará como administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombreOrganizacion">Nombre de la organización</Label>
              <Input
                id="nombreOrganizacion"
                required
                value={nombreOrganizacion}
                onChange={(e) => setNombreOrganizacion(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Tu nombre</Label>
              <Input
                id="nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={cargando}>
              {cargando ? "Creando..." : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
