import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES_VALIDOS = ["admin", "usuario", "viewer"];

// Endpoint mínimo sin UI todavía — el panel de administración de equipo
// (Fase 3) construirá sobre este mismo endpoint. Solo un admin puede
// invitar, y el nuevo usuario siempre queda en la organización del admin
// que invita (nunca en una que envíe el body).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (session.user.rol !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede invitar miembros.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { email, nombre, password, rol } = body ?? {};

  if (!email || !nombre || !password || !rol) {
    return NextResponse.json(
      { error: "Faltan campos requeridos.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (!ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json(
      { error: "Rol inválido.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email.", code: "EMAIL_TAKEN" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const nuevoUsuario = await prisma.user.create({
    data: {
      email,
      nombre,
      password: passwordHash,
      rol,
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json(
    { data: { id: nuevoUsuario.id, email: nuevoUsuario.email, rol: nuevoUsuario.rol } },
    { status: 201 },
  );
}
