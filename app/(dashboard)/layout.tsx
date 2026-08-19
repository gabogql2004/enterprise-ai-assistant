import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm text-muted-foreground">
          {session?.user?.email} · {session?.user?.rol}
        </span>
        <SignOutButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
