import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const estaAutenticado = !!req.auth;
  const esRutaAuth = ["/login", "/register"].includes(req.nextUrl.pathname);

  if (!estaAutenticado && !esRutaAuth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (estaAutenticado && esRutaAuth) {
    return NextResponse.redirect(new URL("/chat", req.nextUrl.origin));
  }
});

export const config = {
  // Excluye toda /api/*: los endpoints validan la sesión ellos mismos y
  // devuelven JSON con el formato de error estándar en vez de un redirect
  // HTML, que rompería a un cliente que espera JSON.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
