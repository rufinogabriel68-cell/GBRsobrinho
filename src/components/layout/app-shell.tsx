"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { DemoBadge } from "./demo-badge";
import { LogoMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Estrutura do painel:
 * - Desktop (lg+): barra lateral fixa à esquerda;
 * - Celular: topo compacto + barra de navegação INFERIOR fixa
 *   (padrão de apps móveis, alcançável com o polegar, com área segura).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background">
      {/* ===== Barra lateral (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 border-b border-border px-5 py-5"
        >
          <LogoMark className="h-10 w-10 text-xs" />
          <span>
            <span className="block text-sm font-semibold leading-tight">
              GBR Sobrinho
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Painel de gestão
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </nav>

        <SidebarFooter />
      </aside>

      {/* ===== Conteúdo ===== */}
      <div className="lg:pl-64">
        {/* Topo (celular) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <LogoMark />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-none">
                GBR Sobrinho
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Painel de gestão
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ===== Navegação inferior (celular) ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom,0px)]">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

function SidebarFooter() {
  const { user, mode, signOutUser } = useAuth();
  const initials =
    (user?.displayName || user?.email || "?")
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="border-t border-border p-3">
      {mode === "demo" ? <DemoBadge className="mb-2 ml-1" /> : null}
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.displayName || "Usuário"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email || "—"}
          </p>
        </div>
        <SignOutButton compact />
      </div>
    </div>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { signOutUser } = useAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Sair da conta"
      onClick={async () => {
        await signOutUser();
        router.replace("/login");
      }}
      className={cn(
        "rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        compact ? "p-2" : "h-11 w-11"
      )}
    >
      <LogOut className={compact ? "h-4.5 w-4.5" : "h-5 w-5"} />
    </button>
  );
}
