"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  FileText,
  Smile,
  Users,
  CreditCard,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/sentiment", label: "Sentimiento", icon: Smile },
  { href: "/team", label: "Equipo", icon: Users },
  { href: "/billing", label: "Facturación", icon: CreditCard },
];

function iniciales(nombre: string | null | undefined) {
  if (!nombre) return "?";
  return nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-4 py-5">
        <Logo className="text-sm" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {iniciales(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">
                {session?.user?.rol}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-1 px-2">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
