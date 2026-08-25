import { auth } from "@/lib/auth";
import { AuthSessionProvider } from "@/components/session-provider";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AuthSessionProvider session={session}>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </AuthSessionProvider>
  );
}
