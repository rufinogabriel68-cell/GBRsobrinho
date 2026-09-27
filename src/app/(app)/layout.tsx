"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { FullScreenLoader } from "@/components/ui/loader";

/**
 * Layout das telas autenticadas: protege as rotas do painel.
 * Sem usuário logado → redireciona para /login.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <FullScreenLoader label="Carregando sessão…" />;
  if (!user) return <FullScreenLoader label="Redirecionando para o login…" />;

  return <AppShell>{children}</AppShell>;
}
