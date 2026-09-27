"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, FileDown, Pencil, Plus, Wallet, TrendingUp } from "lucide-react";
import {
  AddButton,
  Badge,
  Card,
  DangerButton,
  EmptyState,
  Field,
  Label,
  Modal,
  PageHead,
  SearchInput,
} from "@/components/ui";
import { BarsChart, FlowChart } from "@/components/charts";
import { Progress } from "@/components/ui";
import { ReportDoc, printNow } from "@/components/doc";
import { useStore } from "@/lib/store";
import { brl, fmtDate, isoDay, monthKey, num } from "@/lib/format";

const CATEGORIES = ["Serviços", "Contratos", "Materiais", "Deslocamento", "Taxas", "Administrativo", "Veículo", "Outros"];

export default function FinanceiroPage() {
  const { data, mutate, settingsValue, notify } = useStore();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"todos" | "in" | "out">("todos");
  const [draft, setDraft] = useState<any | null>(null);
  const [printing, setPrinting] = useState(false);

  const finance = data.finance || [];
  const orders = data.orders || [];
  const settings = settingsValue("goals", { monthly: 8000, savingsPct: 20 });
  const goal = Number(settings.monthly) || 8000;

  const now = new Date();
  const mk = monthKey(now);

  const monthRows = finance
    .filter((f: any) => monthKey(f.entryDate) === mk)
    .sort((a: any, b: any) => +new Date(b.entryDate) - +new Date(a.entryDate));

  const monthIn = monthRows.filter((f: any) => f.kind === "in").reduce((a: number, f: any) => a + Number(f.amount), 0);
  const monthOut = monthRows.filter((f: any) => f.kind === "out").reduce((a: number, f: any) => a + Number(f.amount), 0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return finance
      .filter((f: any) => kind === "todos" || f.kind === kind)
      .filter((f: any) => !term || `${f.description} ${f.category || ""}`.toLowerCase().includes(term))
      .sort((a: any, b: any) => +new Date(b.entryDate) - +new Date(a.entryDate));
  }, [finance, kind, q]);

  const series = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      out.push({
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        value: finance.filter((f: any) => f.kind === "in" && monthKey(f.entryDate) === key).reduce((a: number, f: any) => a + Number(f.amount), 0),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finance]);

  const flow = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    const inflow: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      inflow.push({ label, value: finance.filter((f: any) => f.kind === "in" && monthKey(f.entryDate) === key).reduce((a: number, f: any) => a + Number(f.amount), 0) });
      out.push({ label, value: finance.filter((f: any) => f.kind === "out" && monthKey(f.entryDate) === key).reduce((a: number, f: any) => a + Number(f.amount), 0) });
    }
    return { inflow, out };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finance]);

  const nextNumber = () => {
    const max = finance.reduce((a: number, x: any) => Math.max(a, Number(String(x.id).toString()) || 0), 0);
    return max + 1;
  };

  const save = async () => {
    if (!draft?.description.trim()) return;
    const payload = { ...draft, entryDate: new Date(draft.entryDate).toISOString(), amount: Number(draft.amount) };
    if (draft.id) await mutate({ table: "finance", op: "update", id: draft.id, data: payload });
    else await mutate({ table: "finance", op: "create", data: payload });
    notify("Lançamento salvo.", "green");
    setDraft(null);
  };

  const byOrder = orders
    .map((o: any) => {
      const cost = Number(o.costMaterials || 0) + Number(o.costTravel || 0) + Number(o.costLabor || 0);
      return { order: o, cost, margin: Number(o.total || 0) - cost };
    })
    .sort((a, b) => b.margin - a.margin);

  const reportMonth = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHead
        eyebrow="Dinheiro"
        title="Financeiro"
        subtitle="Entradas, saídas, meta do mês, fluxo de caixa e o custo real de cada ordem de serviço."
        actions={
          <>
            <button className="btn" type="button" onClick={() => { setPrinting(true); setTimeout(printNow, 180); }}>
              <FileDown size={15} /> Relatório mensal
            </button>
            <AddButton
              onClick={() =>
                setDraft({
                  kind: "in",
                  description: "",
                  amount: 0,
                  category: "Serviços",
                  entryDate: new Date().toISOString().slice(0, 16),
                  method: "Pix",
                })
              }
            >
              Novo lançamento
            </AddButton>
          </>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-6 rise lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Label>Entradas do mês</Label>
              <p className="h-card mt-3 tnum" style={{ color: "var(--green)" }}>{brl(monthIn)}</p>
              <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-2)" }}>
                Saídas {brl(monthOut)} · resultado{" "}
                <strong style={{ color: monthIn - monthOut >= 0 ? "var(--green)" : "var(--red)" }}>{brl(monthIn - monthOut)}</strong>
              </p>
            </div>
            <div className="text-right">
              <Label>Meta mensal</Label>
              <p className="tnum mt-2 text-[22px] font-semibold">{brl(goal)}</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>{num((monthIn / goal) * 100, 0)}% atingido</p>
            </div>
          </div>
          <div className="mt-5">
            <Progress value={(monthIn / goal) * 100} thick tone={monthIn >= goal ? "green" : "blue"} />
          </div>
          <div className="mt-6" style={{ borderTop: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between pt-4">
              <Label>Fluxo de caixa · 6 meses</Label>
              <div className="flex gap-3 text-[12px]">
                <span className="flex items-center gap-1.5" style={{ color: "var(--green)" }}><ArrowUpRight size={12} /> entradas</span>
                <span className="flex items-center gap-1.5" style={{ color: "var(--red)" }}><ArrowDownRight size={12} /> saídas</span>
              </div>
            </div>
            <div className="mt-3">
              <FlowChart inflow={flow.inflow} outflow={flow.out} height={120} />
              <div className="mt-1 flex gap-1.5">
                {flow.inflow.map((d) => (
                  <span key={d.label} className="flex-1 text-center text-[10.5px]" style={{ color: "var(--text-3)" }}>{d.label}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 rise" style={{ animationDelay: "60ms" }}>
          <Label>Entradas por mês</Label>
          <div className="mt-4">
            <BarsChart data={series} format={brl} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl px-3 py-3" style={{ background: "var(--inset)" }}>
              <p className="label mb-1.5">Economia sugerida</p>
              <p className="tnum text-[17px] font-semibold">{brl((monthIn - monthOut) * (Number(settings.savingsPct) / 100))}</p>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ background: "var(--inset)" }}>
              <p className="label mb-1.5">Lançamentos</p>
              <p className="tnum text-[17px] font-semibold">{monthRows.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* custos por OS */}
      <Card className="mb-5 overflow-hidden rise">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--accent)" }} />
            <span className="text-[15px] font-semibold">Custo e margem por OS</span>
          </div>
          <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>materiais + deslocamento + mão de obra</span>
        </div>
        {byOrder.length === 0 ? (
          <EmptyState icon={<Wallet size={26} />} title="Sem ordens de serviço" hint="Quando você registrar custos em uma OS, a margem aparece aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  {["OS", "Cliente", "Receita", "Custos", "Margem", "Margem %"].map((h, i) => (
                    <th key={h} className="label px-6 py-3" style={{ textAlign: i > 1 ? "right" : "left", borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byOrder.map(({ order, cost, margin }, i) => {
                  const pct = Number(order.total) > 0 ? (margin / Number(order.total)) * 100 : 0;
                  const client = (data.clients || []).find((c: any) => c.id === order.clientId);
                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid var(--line)", background: i % 2 ? "var(--panel-2)" : "var(--panel)" }}>
                      <td className="px-6 py-3">
                        <span className="mono text-[12.5px]" style={{ color: "var(--text-3)" }}>{order.number}</span>
                        <span className="block text-[13.5px] font-medium">{order.title}</span>
                      </td>
                      <td className="px-6 py-3 text-[13.5px]" style={{ color: "var(--text-2)" }}>{client?.name || "—"}</td>
                      <td className="tnum px-6 py-3 text-right text-[14px]">{brl(order.total)}</td>
                      <td className="tnum px-6 py-3 text-right text-[14px]" style={{ color: "var(--red)" }}>{brl(cost)}</td>
                      <td className="tnum px-6 py-3 text-right text-[14px] font-semibold" style={{ color: margin >= 0 ? "var(--green)" : "var(--red)" }}>{brl(margin)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="tnum text-[13.5px]">{num(pct, 0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* lançamentos */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar lançamento…" />
        </div>
        <div className="seg">
          <button type="button" data-active={kind === "todos"} onClick={() => setKind("todos")}>Todos</button>
          <button type="button" data-active={kind === "in"} onClick={() => setKind("in")}>Entradas</button>
          <button type="button" data-active={kind === "out"} onClick={() => setKind("out")}>Saídas</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={26} />}
            title="Nenhum lançamento"
            hint="Registre entradas e saídas para ver o fluxo de caixa e o quanto falta para a meta."
            action={<AddButton onClick={() => setDraft({ kind: "in", description: "", amount: 0, category: "Serviços", entryDate: new Date().toISOString().slice(0, 16), method: "Pix" })}>Novo lançamento</AddButton>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((f: any, i: number) => (
            <div key={f.id} className="row rise" style={{ gridTemplateColumns: "auto 1fr auto auto", animationDelay: `${i * 25}ms` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: f.kind === "in" ? "var(--green-soft)" : "var(--red-soft)", color: f.kind === "in" ? "var(--green)" : "var(--red)" }}>
                {f.kind === "in" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">{f.description}</span>
                <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  {fmtDate(f.entryDate)} · {f.category || "sem categoria"}{f.method ? ` · ${f.method}` : ""}
                </span>
              </span>
              <span className="tnum text-[14.5px] font-semibold" style={{ color: f.kind === "in" ? "var(--green)" : "var(--red)" }}>
                {f.kind === "in" ? "" : "− "}
                {brl(f.amount)}
              </span>
              <span className="flex gap-1">
                <button className="btn btn-ghost h-8 w-8 rounded-full p-0" type="button" aria-label="Editar" onClick={() => setDraft({ ...f, entryDate: new Date(f.entryDate).toISOString().slice(0, 16) })}>
                  <Pencil size={14} />
                </button>
                <DangerButton
                  onConfirm={async () => {
                    await mutate({ table: "finance", op: "delete", id: f.id });
                    notify("Lançamento excluído.", "amber");
                  }}
                />
              </span>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar lançamento" : "Novo lançamento"}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={save}>Salvar</button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4">
            <div className="seg self-start">
              <button type="button" data-active={draft.kind === "in"} onClick={() => setDraft({ ...draft, kind: "in" })}>Entrada</button>
              <button type="button" data-active={draft.kind === "out"} onClick={() => setDraft({ ...draft, kind: "out" })}>Saída</button>
            </div>
            <Field label="Descrição">
              <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Ex.: Pagamento OS-2026-0088" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor (R$)">
                <input className="input tnum" type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              </Field>
              <Field label="Data">
                <input className="input" type="datetime-local" value={draft.entryDate} onChange={(e) => setDraft({ ...draft, entryDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                <select className="select" value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Forma de pagamento">
                <select className="select" value={draft.method || ""} onChange={(e) => setDraft({ ...draft, method: e.target.value })}>
                  {["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto", "Outro"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Vincular a uma OS">
              <select className="select" value={draft.orderId ?? ""} onChange={(e) => setDraft({ ...draft, orderId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sem vínculo</option>
                {orders.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.number} — {o.title}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {printing && (
        <ReportDoc
          month={reportMonth}
          rows={monthRows}
          totals={{ in: monthIn, out: monthOut, goal }}
          company={settingsValue("company", {} as any)}
          footer={settingsValue("pdf", { footer: "" }).footer}
        />
      )}
    </div>
  );
}
