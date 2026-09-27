"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Package,
  Plus,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useClients, useOrders } from "@/lib/hooks";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import {
  brl,
  formatDate,
  formatPercent,
  monthLabel,
  percentDelta,
} from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { RevenueChart, type RevenuePoint } from "@/components/charts/revenue-chart";
import { StatusPie } from "@/components/charts/status-pie";

const BANNER_KEY = "gbr-demo-banner-dismissed";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardOverview() {
  const { user, mode } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();
  const { clients, loading: clientsLoading } = useClients();

  const firstName = user?.displayName?.split(/\s+/)[0] ?? "tudo bem";
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats = useMemo(() => {
    const now = new Date();
    const currentKey = monthKey(now);
    const previousKey = monthKey(
      new Date(now.getFullYear(), now.getMonth() - 1, 1)
    );

    const valid = (orders ?? []).filter((o) => o.status !== "cancelado");

    const monthRevenue = valid
      .filter((o) => o.date.startsWith(currentKey))
      .reduce((sum, o) => sum + o.total, 0);
    const previousRevenue = valid
      .filter((o) => o.date.startsWith(previousKey))
      .reduce((sum, o) => sum + o.total, 0);

    const monthOrdersCount = (orders ?? []).filter((o) =>
      o.date.startsWith(currentKey)
    ).length;
    const previousOrdersCount = (orders ?? []).filter((o) =>
      o.date.startsWith(previousKey)
    ).length;

    const avgTicket =
      monthOrdersCount > 0 ? monthRevenue / monthOrdersCount : 0;

    // Faturamento dos últimos 6 meses
    const months: RevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      months.push({
        month: monthLabel(d),
        total: valid
          .filter((o) => o.date.startsWith(key))
          .reduce((sum, o) => sum + o.total, 0),
      });
    }

    // Pedidos por status
    const statusCounts = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0])
    ) as Record<OrderStatus, number>;
    (orders ?? []).forEach((o) => {
      statusCounts[o.status] += 1;
    });

    // Produtos mais vendidos
    const productMap = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();
    valid.forEach((o) =>
      o.items.forEach((item) => {
        const current =
          productMap.get(item.productId) ??
          { name: item.name, qty: 0, revenue: 0 };
        current.qty += item.qty;
        current.revenue += item.qty * item.unitPrice;
        productMap.set(item.productId, current);
      })
    );
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrders = [...(orders ?? [])]
      .sort((a, b) => b.createdAt - a.createdAt || b.code - a.code)
      .slice(0, 5);

    return {
      monthRevenue,
      previousRevenue,
      monthOrdersCount,
      previousOrdersCount,
      avgTicket,
      months,
      statusCounts,
      topProducts,
      recentOrders,
    };
  }, [orders]);

  const revenueDelta = percentDelta(stats.monthRevenue, stats.previousRevenue);
  const ordersDelta = percentDelta(
    stats.monthOrdersCount,
    stats.previousOrdersCount
  );
  const hasOrders = (orders ?? []).length > 0;
  const maxProductRevenue =
    stats.topProducts[0]?.revenue > 0 ? stats.topProducts[0].revenue : 1;

  return (
    <div className="space-y-6">
      {mode === "demo" ? <DemoBanner /> : null}

      {/* ===== Cabeçalho ===== */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {today}
          </p>
        </div>
        <ButtonLink href="/dashboard/pedidos?novo=1" size="md">
          <Plus className="h-4 w-4" aria-hidden />
          Novo pedido
        </ButtonLink>
      </header>

      {/* ===== Indicadores ===== */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores do mês"
      >
        {ordersLoading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          <>
            <KpiCard
              title="Faturamento do mês"
              value={brl(stats.monthRevenue)}
              icon={Wallet}
              trend={
                revenueDelta === null
                  ? null
                  : `${formatPercent(revenueDelta)} vs. mês anterior`
              }
              trendDirection={
                revenueDelta === null
                  ? "neutral"
                  : revenueDelta >= 0
                    ? "up"
                    : "down"
              }
            />
            <KpiCard
              title="Pedidos no mês"
              value={String(stats.monthOrdersCount)}
              icon={ShoppingCart}
              trend={
                ordersDelta === null
                  ? null
                  : `${formatPercent(ordersDelta)} vs. mês anterior`
              }
              trendDirection={
                ordersDelta === null
                  ? "neutral"
                  : ordersDelta >= 0
                    ? "up"
                    : "down"
              }
            />
            <KpiCard
              title="Clientes cadastrados"
              value={String(clients?.length ?? 0)}
              icon={Users}
              trend={
                clientsLoading ? null : `${clients?.length ?? 0} no total`
              }
            />
            <KpiCard
              title="Ticket médio (mês)"
              value={brl(stats.avgTicket)}
              icon={Package}
              trend="por pedido concluído"
            />
          </>
        )}
      </section>

      {/* ===== Gráficos ===== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Faturamento</CardTitle>
              <CardDescription>
                Últimos 6 meses · pedidos não cancelados
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-64 w-full sm:h-72" />
            ) : hasOrders ? (
              <RevenueChart data={stats.months} />
            ) : (
              <EmptyState
                icon={Wallet}
                title="Sem faturamento para exibir"
                description="Cadastre seus pedidos para acompanhar a evolução mês a mês."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status dos pedidos</CardTitle>
            <CardDescription>Distribuição geral</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : hasOrders ? (
              <StatusPie counts={stats.statusCounts} />
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="Nenhum pedido"
                description="Os status aparecem aqui conforme você registra pedidos."
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===== Listas ===== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pedidos recentes</CardTitle>
              <CardDescription>Últimos 5 registros</CardDescription>
            </div>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Nenhum pedido ainda"
                description="Cadastre o primeiro pedido para vê-lo aqui."
                action={
                  <ButtonLink
                    href="/dashboard/pedidos?novo=1"
                    size="sm"
                    className="mt-1"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Novo pedido
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        #{String(order.code).padStart(3, "0")} ·{" "}
                        {order.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.date)} ·{" "}
                        {order.items.length === 1
                          ? "1 item"
                          : `${order.items.length} itens`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {brl(order.total)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Produtos mais vendidos</CardTitle>
              <CardDescription>Por receita acumulada</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : stats.topProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Sem vendas registradas"
                description="Os itens mais vendidos aparecem aqui."
              />
            ) : (
              <ul className="divide-y divide-border">
                {stats.topProducts.map((product) => (
                  <li key={product.name} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {product.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {product.qty} {product.qty === 1 ? "vendido" : "vendidos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(4, (product.revenue / maxProductRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs font-medium">
                        {brl(product.revenue)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** Aviso de modo demonstração (pode ser dispensado) */
function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(BANNER_KEY) === "1");
  }, []);

  if (dismissed) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
        <strong className="font-semibold">Modo demonstração.</strong> Os dados
        exibidos são fictícios e salvos apenas neste navegador. Configure o
        Firebase para usar dados reais — o passo a passo está no README do
        projeto.
      </p>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => {
          window.localStorage.setItem(BANNER_KEY, "1");
          setDismissed(true);
        }}
        className="shrink-0 rounded-lg p-1.5 text-amber-700/70 transition-colors hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400/70 dark:hover:text-amber-400"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
