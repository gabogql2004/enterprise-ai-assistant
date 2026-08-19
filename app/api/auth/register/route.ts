import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { nombreOrganizacion, nombre, email, password } = body ?? {};

  if (!nombreOrganizacion || !nombre || !email || !password) {
    return NextResponse.json(
      { error: "Faltan campos requeridos.", code: "INVALID_INPUT" },
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

  // Registrar crea la organización y su primer usuario (admin) en una sola
  // transacción: no queremos una Organization huérfana si falla la creación
  // del User, ni viceversa.
  const { organization, user } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { nombre: nombreOrganizacion },
    });

    const user = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        nombre,
        organizationId: organization.id,
        rol: "admin",
      },
    });

    return { organization, user };
  });

  return NextResponse.json(
    {
      data: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    { status: 201 },
  );
}
