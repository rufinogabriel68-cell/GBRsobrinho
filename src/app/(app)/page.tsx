"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  PackageMinus,
  Plus,
  Timer,
  TrendingUp,
  ClipboardList,
  FileText,
} from "lucide-react";
import { Card, Label, Badge, Progress, EmptyState, cx } from "@/components/ui";
import { BarsChart, Donut, Sparkline } from "@/components/charts";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/theme";
import { brl, fmtDate, fmtTime, monthKey, QUOTE_STATUS, ORDER_STATUS, OPEN_ORDER_STATUS, num } from "@/lib/format";

const GRID = "grid grid-cols-12 gap-4 sm:gap-5";

function Widget({
  span,
  children,
  delay = 0,
  className,
}: {
  span: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={cx(span, className, "rise")} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { data, settingsValue } = useStore();
  const now = new Date();
  const nowTs = useNow(30_000);
  const mk = monthKey(now);

  const quotes = data.quotes || [];
  const orders = data.orders || [];
  const clients = data.clients || [];
  const events = data.events || [];
  const stock = data.stock || [];
  const finance = data.finance || [];
  const services = data.services || [];

  const byStatus = useMemo(() => {
    const base: Record<string, number> = { aguardando: 0, aprovado: 0, faturado: 0, recusado: 0 };
    quotes.forEach((q: any) => {
      if (base[q.status] != null) base[q.status] += 1;
    });
    return base;
  }, [quotes]);

  const monthIn = finance
    .filter((f: any) => f.kind === "in" && monthKey(f.entryDate) === mk)
    .reduce((a: number, f: any) => a + Number(f.amount || 0), 0);
  const monthOut = finance
    .filter((f: any) => f.kind === "out" && monthKey(f.entryDate) === mk)
    .reduce((a: number, f: any) => a + Number(f.amount || 0), 0);
  const goal = Number(settingsValue("goals", { monthly: 8000 }).monthly) || 8000;
  const progress = (monthIn / goal) * 100;

  const activeOrders = orders.filter((o: any) => OPEN_ORDER_STATUS.includes(o.status));

  const upcoming = useMemo(
    () =>
      [...events]
        // nowTs = 0 antes do primeiro efeito: nesse instante ainda não há dados carregados
        .filter((e: any) => !nowTs || new Date(e.startAt).getTime() > nowTs - 3600000)
        .sort((a: any, b: any) => +new Date(a.startAt) - +new Date(b.startAt))
        .slice(0, 4),
    [events, nowTs],
  );

  const lowStock = stock.filter((s: any) => Number(s.quantity) <= Number(s.minQuantity));

  const topServices = useMemo(() => {
    const counter = new Map<string, number>();
    quotes.forEach((q: any) => (q.items || []).forEach((it: any) => counter.set(it.name, (counter.get(it.name) || 0) + Number(it.qty || 1))));
    orders.forEach((o: any) =>
      (o.serviceIds || []).forEach((id: number) => {
        const s = services.find((x: any) => x.id === id);
        if (s) counter.set(s.name, (counter.get(s.name) || 0) + 1);
      }),
    );
    return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [quotes, orders, services]);

  const cashSeries = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const total = finance
        .filter((f: any) => f.kind === "in" && monthKey(f.entryDate) === key)
        .reduce((a: number, f: any) => a + Number(f.amount || 0), 0);
      out.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), value: total });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finance]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const pendingValue = quotes
    .filter((q: any) => q.status === "aguardando")
    .reduce((a: number, q: any) => a + Number(q.total || 0), 0);

  return (
    <div className="space-y-5">
      {/* faixa de saudação com foto */}
      <Widget span="col-span-12" delay={0}>
        <div className="relative overflow-hidden rounded-[26px]" style={{ border: "1px solid var(--line)" }}>
          <img
            src="/images/bench.jpg"
            alt="Bancada de trabalho com ferramentas da GBR Soluções"
            // no tema escuro a foto é atenuada para não "estourar" branco na tela preta
            className="absolute inset-0 h-full w-full object-cover dark:opacity-[.62] dark:saturate-[.85]"
            style={{ objectPosition: "70% 50%" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, var(--panel) 0%, var(--panel) 34%, color-mix(in srgb, var(--panel) 72%, transparent) 56%, transparent 88%)",
            }}
          />
          {/* scrim extra para telas estreitas: garante contraste do texto sobre a foto */}
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--panel) 92%, transparent) 0%, color-mix(in srgb, var(--panel) 78%, transparent) 100%)",
            }}
          />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div>
              <Label>{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</Label>
              <h1 className="h-display mt-2">
                {greeting}, Gabriel.
              </h1>
              <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {activeOrders.length} ordens de serviço em andamento, {byStatus.aguardando} orçamentos aguardando resposta e{" "}
                {lowStock.length} itens abaixo do mínimo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/calculadora" className="btn btn-primary">
                <Plus size={16} strokeWidth={2.4} /> Novo orçamento
              </Link>
              <Link href="/agenda" className="btn">
                <CalendarClock size={16} /> Agenda
              </Link>
            </div>
          </div>
        </div>
      </Widget>

      {/* faturamento x meta — faixa larga */}
      <Widget span="col-span-12" delay={60}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="lg:w-[300px] shrink-0">
              <Label>Faturamento do mês</Label>
              <p className="h-card mt-3 tnum">{brl(monthIn)}</p>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                Meta {brl(goal)} · {progress >= 100 ? "meta atingida" : `faltam ${brl(goal - monthIn)}`}
              </p>
            </div>

            <div className="flex-1">
              <div className="mb-2 flex items-end justify-between">
                <span className="label">Progresso da meta</span>
                <span className="tnum text-[13px] font-semibold" style={{ color: progress >= 100 ? "var(--green)" : "var(--accent)" }}>
                  {num(progress, 0)}%
                </span>
              </div>
              <Progress value={progress} thick tone={progress >= 100 ? "green" : "blue"} />
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Saídas no mês" value={brl(monthOut)} />
                <Stat label="Resultado" value={brl(monthIn - monthOut)} tone={monthIn - monthOut >= 0 ? "var(--green)" : "var(--red)"} />
                <Stat label="Aguardando" value={brl(pendingValue)} tone="var(--amber)" />
              </div>
            </div>

            <div className="hidden shrink-0 xl:block">
              <Donut value={Math.min(100, progress)} tone={progress >= 100 ? "var(--green)" : "var(--accent)"} size={124}>
                <span className="tnum text-[22px] font-semibold">{num(progress, 0)}%</span>
                <span className="label mt-0.5">da meta</span>
              </Donut>
            </div>
          </div>
        </Card>
      </Widget>

      {/* orçamentos + OS */}
      <Widget span="col-span-12 lg:col-span-7" delay={120}>
        <Card className="h-full p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <Label>Orçamentos por status</Label>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                {quotes.length} no total · {brl(pendingValue)} em aberto
              </p>
            </div>
            <Link href="/orcamentos" className="btn btn-ghost h-8 px-3 text-[13px]">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(QUOTE_STATUS).map(([key, meta]) => (
              <div key={key} className="rounded-2xl p-4" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <p className="mt-3 text-[30px] font-semibold leading-none tnum" style={{ letterSpacing: "-0.03em" }}>
                  {byStatus[key]}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/orcamentos" className="btn h-8 px-3 text-[13px]"><FileText size={14} /> Abrir orçamentos</Link>
            <Link href="/calculadora" className="btn h-8 px-3 text-[13px]"><Plus size={14} /> Calcular novo</Link>
          </div>
        </Card>
      </Widget>

      <Widget span="col-span-12 lg:col-span-5" delay={160}>
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label>Ordens em andamento</Label>
            <Link href="/os" className="btn btn-ghost h-8 px-3 text-[13px]">Abrir <ArrowUpRight size={14} /></Link>
          </div>
          {activeOrders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={26} />}
              title="Nenhuma OS aberta"
              hint="Quando você criar uma ordem de serviço, ela aparece aqui com o status em tempo real."
              action={<Link href="/os" className="btn btn-primary">Criar OS</Link>}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {activeOrders.slice(0, 4).map((o: any) => {
                const meta = ORDER_STATUS[o.status] || ORDER_STATUS.aberta;
                return (
                  <Link
                    key={o.id}
                    href="/os"
                    className="group flex items-center gap-3 rounded-2xl p-3 transition"
                    style={{ background: "var(--inset)", border: "1px solid var(--line)" }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--accentSoft)", color: "var(--accent)" }}
                    >
                      <Timer size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{o.title}</span>
                      <span className="mono block text-[11.5px]" style={{ color: "var(--text-3)" }}>
                        {o.number} · {o.scheduledAt ? fmtDate(o.scheduledAt, { day: "2-digit", month: "short" }) : "sem data"}
                      </span>
                    </span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </Widget>

      {/* próximos compromissos */}
      <Widget span="col-span-12 lg:col-span-5" delay={200}>
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label>Próximos compromissos</Label>
            <Link href="/agenda" className="btn btn-ghost h-8 px-3 text-[13px]">Agenda <ArrowUpRight size={14} /></Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock size={26} />} title="Agenda livre" hint="Nenhum compromisso marcado. Aproveite para prospectar novos clientes." />
          ) : (
            <div className="relative pl-4" style={{ borderLeft: "2px solid var(--line)" }}>
              {upcoming.map((e: any) => (
                <div key={e.id} className="relative mb-4 last:mb-0">
                  <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: e.color || "var(--accent)", boxShadow: "0 0 0 3px var(--panel)" }} />
                  <p className="text-[14px] font-medium leading-snug">{e.title}</p>
                  <p className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
                    {fmtDate(e.startAt, { weekday: "short", day: "2-digit", month: "short" })} · {fmtTime(e.startAt)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Widget>

      {/* estoque baixo */}
      <Widget span="col-span-12 lg:col-span-4" delay={240}>
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label>Estoque baixo</Label>
            <Link href="/estoque" className="btn btn-ghost h-8 px-3 text-[13px]">Estoque <ArrowUpRight size={14} /></Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState icon={<PackageMinus size={26} />} title="Tudo acima do mínimo" hint="Nenhum item precisa de reposição agora." />
          ) : (
            <div className="flex flex-col gap-3">
              {lowStock.slice(0, 5).map((s: any) => {
                const pct = Math.min(100, (Number(s.quantity) / Math.max(1, Number(s.minQuantity))) * 100);
                return (
                  <div key={s.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium">{s.name}</span>
                      <span className="mono shrink-0 text-[12px]" style={{ color: "var(--amber)" }}>
                        {num(s.quantity, Number(s.quantity) % 1 ? 1 : 0)}/{num(s.minQuantity)} {s.unit}
                      </span>
                    </div>
                    <Progress value={pct} tone="amber" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Widget>

      {/* serviços mais realizados */}
      <Widget span="col-span-12 lg:col-span-4" delay={280}>
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label>Serviços mais realizados</Label>
            <Link href="/servicos" className="btn btn-ghost h-8 px-3 text-[13px]">Tabela <ArrowUpRight size={14} /></Link>
          </div>
          {topServices.length === 0 ? (
            <EmptyState icon={<TrendingUp size={26} />} title="Sem histórico ainda" hint="Os serviços vendidos em orçamentos e OS aparecem aqui em ordem de frequência." />
          ) : (
            <div className="flex flex-col gap-3">
              {topServices.map(([name, count], idx) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="mono w-5 text-[12px]" style={{ color: "var(--text-3)" }}>{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{name}</span>
                  <span
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.max(16, (count / topServices[0][1]) * 70)}px`, background: "var(--accent)", opacity: 0.85 }}
                  />
                  <span className="mono w-5 text-right text-[12.5px] font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Widget>

      {/* fluxo 6 meses */}
      <Widget span="col-span-12 lg:col-span-4" delay={320}>
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label>Entradas · 6 meses</Label>
            <span className="text-[12.5px]" style={{ color: "var(--text-2)" }}>total {brl(cashSeries.reduce((a, b) => a + b.value, 0))}</span>
          </div>
          <BarsChart data={cashSeries} format={brl} />
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
            <Sparkline points={cashSeries.map((c) => c.value)} tone="var(--green)" />
          </div>
        </Card>
      </Widget>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl px-3 py-2.5" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
      <p className="label mb-1.5 truncate">{label}</p>
      <p className="tnum truncate text-[15px] font-semibold" style={{ color: tone || "var(--text)" }}>{value}</p>
    </div>
  );
}
