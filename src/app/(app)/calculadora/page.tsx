"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Check, Minus, Plus, Search, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Card, Label, EmptyState, PageHead, SearchInput, Field } from "@/components/ui";
import { useStore } from "@/lib/store";
import { brl, num } from "@/lib/format";

type Line = { serviceId: number; name: string; qty: number };

type Faixa = "eco" | "med" | "prem";
const PRICE_LABEL: Record<Faixa, string> = { eco: "Econômico", med: "Médio", prem: "Premium" };
const PRICE_KEY: Record<Faixa, "priceEco" | "priceMed" | "pricePrem"> = {
  eco: "priceEco",
  med: "priceMed",
  prem: "pricePrem",
};

export default function CalculadoraPage() {
  const { data, mutate, settingsValue, notify } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [faixa, setFaixa] = useState<Faixa>("med");
  const [lines, setLines] = useState<Line[]>([]);
  const [fee, setFee] = useState(Number(settingsValue("fees", { cardPercent: 3.49 }).cardPercent) || 0);
  const [passFee, setPassFee] = useState(true);
  const [discount, setDiscount] = useState(0);

  const services = data.services || [];
  const categories = data.categories || [];
  const clients = data.clients || [];
  const [clientId, setClientId] = useState<number | "">("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s: any) => !term || (s.name + " " + (s.description || "")).toLowerCase().includes(term));
  }, [services, q]);

  const grouped = categories
    .map((c: any) => ({ cat: c, items: filtered.filter((s: any) => s.categoryId === c.id) }))
    .filter((g) => g.items.length);

  const priceOf = (id: number) => {
    const s = services.find((x: any) => x.id === id);
    return s ? Number(s[PRICE_KEY[faixa]] || 0) : 0;
  };

  const subtotal = lines.reduce((a, l) => a + priceOf(l.serviceId) * l.qty, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const feeValue = passFee ? (afterDiscount / (1 - fee / 100)) * (fee / 100) : 0;
  const total = afterDiscount + feeValue;
  const totalMinutes = lines.reduce((a, l) => {
    const s = services.find((x: any) => x.id === l.serviceId);
    return a + (Number(s?.durationMinutes || 0) * l.qty);
  }, 0);

  const add = (s: any) =>
    setLines((prev) => {
      const found = prev.find((l) => l.serviceId === s.id);
      return found
        ? prev.map((l) => (l.serviceId === s.id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { serviceId: s.id, name: s.name, qty: 1 }];
    });

  const setQty = (id: number, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.serviceId !== id) : prev.map((l) => (l.serviceId === id ? { ...l, qty } : l))));

  const toQuote = async () => {
    if (!lines.length) return;
    const items = lines.map((l) => ({ serviceId: l.serviceId, name: l.name, qty: l.qty, unit: priceOf(l.serviceId) }));
    const next = (data.quotes || []).length
      ? Math.max(...(data.quotes || []).map((x: any) => Number(String(x.number).split("-").pop()) || 0)) + 1
      : 1;
    const number = `ORC-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
    await mutate({
      table: "quotes",
      op: "create",
      data: {
        number,
        clientId: clientId === "" ? null : clientId,
        title: items.length === 1 ? items[0].name : `${items.length} serviços`,
        items,
        subtotal,
        discount,
        feePercent: passFee ? fee : 0,
        total,
        status: "aguardando",
        validity: Number(settingsValue("pdf", { validity: 15 }).validity) || 15,
        conditions: settingsValue("pdf", { conditions: "" }).conditions,
        notes: "",
      },
    });
    notify(`${number} criado com sucesso.`, "green");
    setLines([]);
    router.push("/orcamentos");
  };

  return (
    <div>
      <PageHead
        eyebrow="Orçamento rápido"
        title="Calculadora"
        subtitle="Monte a lista de serviços, escolha a faixa de preço e repasse (ou não) a taxa da maquininha. Vira orçamento com um clique."
      />

      <div className="grid grid-cols-12 gap-5">
        {/* catálogo */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchInput value={q} onChange={setQ} placeholder="Buscar serviço…" />
            </div>
            <div className="seg">
              {(Object.keys(PRICE_LABEL) as Faixa[]).map((f) => (
                <button key={f} type="button" data-active={faixa === f} onClick={() => setFaixa(f)}>
                  {PRICE_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState icon={<Search size={26} />} title="Nenhum serviço encontrado" hint={`Nada corresponde a “${q}”. Verifique a grafia ou cadastre o serviço na aba Serviços.`} />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {grouped.map(({ cat, items }) => (
                <Card key={cat.id} className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />
                    <Label>{cat.name}</Label>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((s: any) => {
                      const chosen = lines.find((l) => l.serviceId === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => add(s)}
                          className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition"
                          style={{ background: chosen ? "var(--accentSoft)" : "var(--inset)", border: "1px solid var(--line)" }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{s.name}</span>
                            <span className="tnum block text-[12.5px]" style={{ color: "var(--text-2)" }}>
                              {brl(s[PRICE_KEY[faixa]])} · {num((s.durationMinutes || 0) / 60, 1)}h
                            </span>
                          </span>
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition"
                            style={{ background: chosen ? "var(--accent)" : "var(--grey-soft)", color: chosen ? "#fff" : "var(--text-2)" }}
                          >
                            {chosen ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.6} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* resumo */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-20">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-2">
                  <Calculator size={16} style={{ color: "var(--accent)" }} />
                  <span className="text-[15px] font-semibold">Cálculo</span>
                </div>
                <span className="label">{lines.length} item(ns)</span>
              </div>

              {lines.length === 0 ? (
                <EmptyState
                  icon={<Sparkles size={26} />}
                  title="Nenhum serviço selecionado"
                  hint="Toque nos serviços ao lado para montar o orçamento. A conta é atualizada em tempo real."
                />
              ) : (
                <div className="px-5 py-4">
                  <div className="flex flex-col gap-2">
                    {lines.map((l) => (
                      <div key={l.serviceId} className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: "var(--inset)" }}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{l.name}</span>
                          <span className="tnum block text-[12px]" style={{ color: "var(--text-2)" }}>
                            {brl(priceOf(l.serviceId))} · {brl(priceOf(l.serviceId) * l.qty)}
                          </span>
                        </span>
                        <button className="btn btn-ghost h-7 w-7 rounded-full p-0" type="button" aria-label="Diminuir" onClick={() => setQty(l.serviceId, l.qty - 1)}>
                          {l.qty === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                        </button>
                        <span className="mono w-5 text-center text-[13.5px]">{l.qty}</span>
                        <button className="btn btn-ghost h-7 w-7 rounded-full p-0" type="button" aria-label="Aumentar" onClick={() => setQty(l.serviceId, l.qty + 1)}>
                          <Plus size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Desconto (R$)">
                        <input className="input tnum" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                      </Field>
                      <Field label="Taxa maquininha (%)">
                        <input className="input tnum" type="number" step="0.01" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2.5 text-[13.5px]" style={{ color: "var(--text-2)" }}>
                      <input type="checkbox" checked={passFee} onChange={(e) => setPassFee(e.target.checked)} />
                      Repassar juros da maquininha ao cliente
                    </label>
                    <Field label="Cliente (opcional)">
                      <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}>
                        <option value="">Sem cliente definido</option>
                        {clients.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4 space-y-1.5 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
                    <Line label="Subtotal" value={brl(subtotal)} />
                    {discount > 0 && <Line label="Desconto" value={`− ${brl(discount)}`} tone="var(--green)" />}
                    {passFee && fee > 0 && <Line label={`Juros ${fee}%`} value={brl(feeValue)} tone="var(--amber)" />}
                    <div className="flex items-baseline justify-between pt-2">
                      <span className="text-[14px] font-semibold">Total</span>
                      <span className="tnum text-[30px] font-semibold" style={{ letterSpacing: "-0.035em" }}>{brl(total)}</span>
                    </div>
                    <p className="text-right text-[12px]" style={{ color: "var(--text-3)" }}>
                      ≈ {num(totalMinutes / 60, 1)}h de serviço estimada
                    </p>
                  </div>

                  <button className="btn btn-primary mt-4 w-full" type="button" onClick={toQuote}>
                    Virar orçamento <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <span className="tnum font-medium" style={{ color: tone || "var(--text)" }}>{value}</span>
    </div>
  );
}
