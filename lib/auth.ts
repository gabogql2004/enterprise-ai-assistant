import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordValida = await bcrypt.compare(password, user.password);
        if (!passwordValida) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          organizationId: user.organizationId,
          rol: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    // Los datos de multi-tenancy (organizationId, rol) se inyectan en el
    // token JWT una sola vez al login, y se copian a la sesión en cada
    // request. Así evitamos un JOIN extra a User/Organization por request.
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId;
        token.rol = user.rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = token.organizationId as string;
        session.user.rol = token.rol as string;
      }
      return session;
    },
  },
});
