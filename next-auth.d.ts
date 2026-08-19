import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      rol: string;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId: string;
    rol: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId: string;
    rol: string;
  }
}
