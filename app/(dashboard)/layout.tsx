import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { AuthSessionProvider } from "@/components/session-provider";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AuthSessionProvider session={session}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <nav className="flex gap-4 text-sm">
            <Link href="/chat" className="hover:underline">Chat</Link>
            <Link href="/sentiment" className="hover:underline">Sentimiento</Link>
            <Link href="/team" className="hover:underline">Equipo</Link>
            <Link href="/billing" className="hover:underline">Facturación</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email} · {session?.user?.rol}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </AuthSessionProvider>
  );
}
