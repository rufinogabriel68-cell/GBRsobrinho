"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Boxes, Pencil, Plus, Search, Package } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { brl, fmtDate, fmtDateTime, num } from "@/lib/format";

type Draft = any;

export default function EstoquePage() {
  const { data, mutate, notify } = useStore();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"todos" | "baixo">("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [move, setMove] = useState<{ item: any; type: "in" | "out"; qty: number; note: string } | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);

  // referências estáveis entre renders (evita recalcular os useMemo a cada render)
  const { stock, moves, orders } = useMemo(
    () => ({
      stock: data.stock || [],
      moves: data.stockMoves || [],
      orders: data.orders || [],
    }),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return stock.filter((s: any) => {
      const low = Number(s.quantity) <= Number(s.minQuantity);
      return (only === "todos" || low) && (!term || `${s.name} ${s.location || ""}`.toLowerCase().includes(term));
    });
  }, [stock, q, only]);

  const lowCount = stock.filter((s: any) => Number(s.quantity) <= Number(s.minQuantity)).length;
  const value = stock.reduce((a: number, s: any) => a + Number(s.quantity) * Number(s.unitCost), 0);
  const history = historyId ? moves.filter((m: any) => m.stockId === historyId).sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [];
  const historyItem = stock.find((s: any) => s.id === historyId);

  const save = async () => {
    if (!draft?.name.trim()) return;
    if (draft.id) await mutate({ table: "stock", op: "update", id: draft.id, data: draft });
    else await mutate({ table: "stock", op: "create", data: { ...draft, updatedAt: new Date().toISOString() } });
    notify("Item salvo no estoque.", "green");
    setDraft(null);
  };

  const confirmMove = async () => {
    if (!move || move.qty <= 0) return;
    await mutate({
      table: "stockMoves",
      op: "create",
      data: { stockId: move.item.id, type: move.type, quantity: move.qty, note: move.note || (move.type === "in" ? "Entrada manual" : "Saída manual") },
    });
    notify(`${move.type === "in" ? "Entrada" : "Saída"} de ${move.qty} ${move.item.unit} registrada.`, move.type === "in" ? "green" : "amber");
    setMove(null);
  };

  return (
    <div>
      <PageHead
        eyebrow="Materiais"
        title="Estoque"
        subtitle="Quantidade, custo e estoque mínimo por item — com baixa automática quando o material é vinculado a uma OS."
        actions={
          <AddButton onClick={() => setDraft({ name: "", unit: "un", quantity: 0, minQuantity: 2, unitCost: 0, location: "" })}>
            Novo item
          </AddButton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Itens cadastrados" value={String(stock.length)} />
        <Stat label="Valor em estoque" value={brl(value)} />
        <Stat label="Abaixo do mínimo" value={String(lowCount)} tone={lowCount ? "var(--amber)" : "var(--green)"} alert={lowCount > 0} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar item ou local…" />
        </div>
        <div className="seg">
          <button type="button" data-active={only === "todos"} onClick={() => setOnly("todos")}>Todos</button>
          <button type="button" data-active={only === "baixo"} onClick={() => setOnly("baixo")}>Estoque baixo</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes size={26} />}
            title="Nenhum item encontrado"
            hint="Cadastre o que você carrega na ferramenta: cabo, conectores, disjuntores, parafusos."
            action={<AddButton onClick={() => setDraft({ name: "", unit: "un", quantity: 0, minQuantity: 2, unitCost: 0, location: "" })}>Novo item</AddButton>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  {["Item", "Local", "Quantidade", "Mínimo", "Custo unit.", "Valor total", ""].map((h, i) => (
                    <th
                      key={h + i}
                      className="label sticky top-0 z-10 px-4 py-3 text-left"
                      style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)", textAlign: i > 1 && i < 6 ? "right" : "left" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any, i: number) => {
                  const low = Number(s.quantity) <= Number(s.minQuantity);
                  return (
                    <tr
                      key={s.id}
                      className="transition"
                      style={{ background: i % 2 ? "var(--panel-2)" : "var(--panel)", borderBottom: "1px solid var(--line)" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: low ? "var(--amber-soft)" : "var(--accentSoft)", color: low ? "var(--amber)" : "var(--accent)" }}>
                            <Package size={14} />
                          </span>
                          <span>
                            <span className="block text-[14px] font-medium">{s.name}</span>
                            {low && <span className="text-[11.5px]" style={{ color: "var(--amber)" }}>repor urgentemente</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13.5px]" style={{ color: "var(--text-2)" }}>{s.location || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="tnum text-[14.5px] font-semibold" style={{ color: low ? "var(--amber)" : "var(--text)" }}>
                          {num(s.quantity, Number(s.quantity) % 1 ? 1 : 0)}
                        </span>
                        <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}> {s.unit}</span>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-[13.5px]" style={{ color: "var(--text-2)" }}>{num(s.minQuantity)}</td>
                      <td className="tnum px-4 py-3 text-right text-[13.5px]">{brl(s.unitCost)}</td>
                      <td className="tnum px-4 py-3 text-right text-[14px] font-medium">{brl(Number(s.quantity) * Number(s.unitCost))}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="btn h-8 w-8 rounded-full p-0" type="button" title="Entrada" aria-label="Registrar entrada" onClick={() => setMove({ item: s, type: "in", qty: 1, note: "" })}>
                            <ArrowUpCircle size={15} style={{ color: "var(--green)" }} />
                          </button>
                          <button className="btn h-8 w-8 rounded-full p-0" type="button" title="Saída" aria-label="Registrar saída" onClick={() => setMove({ item: s, type: "out", qty: 1, note: "" })}>
                            <ArrowDownCircle size={15} style={{ color: "var(--amber)" }} />
                          </button>
                          <button className="btn btn-ghost h-8 w-8 rounded-full p-0" type="button" title="Histórico" aria-label="Ver histórico" onClick={() => setHistoryId(s.id)}>
                            <Search size={14} />
                          </button>
                          <button className="btn btn-ghost h-8 w-8 rounded-full p-0" type="button" title="Editar" aria-label="Editar item" onClick={() => setDraft({ ...s })}>
                            <Pencil size={14} />
                          </button>
                          <DangerButton
                            onConfirm={async () => {
                              await mutate({ table: "stock", op: "delete", id: s.id });
                              notify("Item removido.", "amber");
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* cadastro */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar item" : "Novo item"}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={save}>Salvar</button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4">
            <Field label="Nome do material">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Cabo CAT6 blindado" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Unidade">
                <input className="input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="un / m / kg" />
              </Field>
              <Field label="Quantidade">
                <input className="input tnum" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
              </Field>
              <Field label="Estoque mínimo">
                <input className="input tnum" type="number" value={draft.minQuantity} onChange={(e) => setDraft({ ...draft, minQuantity: Number(e.target.value) })} />
              </Field>
              <Field label="Custo unitário">
                <input className="input tnum" type="number" step="0.01" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Local de guarda">
              <input className="input" value={draft.location || ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Ex.: Bagageiro — gaveta 1" />
            </Field>
          </div>
        )}
      </Modal>

      {/* movimentação */}
      <Modal
        open={!!move}
        onClose={() => setMove(null)}
        title={move ? `${move.type === "in" ? "Entrada" : "Saída"} — ${move.item.name}` : ""}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setMove(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={confirmMove}>Registrar</button>
          </>
        }
      >
        {move && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Badge tone={move.type === "in" ? "green" : "amber"}>{move.type === "in" ? "Entrada" : "Saída"}</Badge>
              <span className="text-[13.5px]" style={{ color: "var(--text-2)" }}>
                Saldo atual: {num(move.item.quantity)} {move.item.unit}
              </span>
            </div>
            <Field label="Quantidade">
              <input className="input tnum" type="number" min={1} value={move.qty} onChange={(e) => setMove({ ...move, qty: Number(e.target.value) })} autoFocus />
            </Field>
            <Field label="Motivo / vínculo" hint="Ex.: OS-2026-0088 ou nome do fornecedor">
              <input className="input" value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} />
            </Field>
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              Novo saldo: <strong className="tnum">
                {num(Math.max(0, Number(move.item.quantity) + (move.type === "in" ? move.qty : -move.qty)))} {move.item.unit}
              </strong>
            </p>
          </div>
        )}
      </Modal>

      {/* histórico */}
      <Modal
        open={historyId !== null}
        onClose={() => setHistoryId(null)}
        title={historyItem ? `Histórico — ${historyItem.name}` : ""}
      >
        {history.length === 0 ? (
          <EmptyState icon={<ArrowUpCircle size={26} />} title="Sem movimentações" hint="Entradas e saídas deste item aparecem aqui, com o vínculo da OS quando houver." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--inset)" }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: m.type === "in" ? "var(--green-soft)" : "var(--amber-soft)", color: m.type === "in" ? "var(--green)" : "var(--amber)" }}>
                  {m.type === "in" ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{m.note || "Movimentação"}</span>
                  <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{fmtDateTime(m.createdAt)}</span>
                </span>
                <span className="tnum text-[14px] font-semibold" style={{ color: m.type === "in" ? "var(--green)" : "var(--amber)" }}>
                  {m.type === "in" ? "+" : "−"}{num(m.quantity, Number(m.quantity) % 1 ? 1 : 0)} {historyItem?.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, tone, alert }: { label: string; value: string; tone?: string; alert?: boolean }) {
  return (
    <Card className="p-5 rise">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {alert && <AlertTriangle size={13} style={{ color: "var(--amber)" }} />}
      </div>
      <p className="tnum mt-2.5 text-[30px] font-semibold" style={{ letterSpacing: "-0.03em", color: tone || "var(--text)" }}>{value}</p>
    </Card>
  );
}
