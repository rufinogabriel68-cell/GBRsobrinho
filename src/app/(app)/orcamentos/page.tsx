"use client";

import { useMemo, useState } from "react";
import {
  FileDown,
  ImagePlus,
  Mail,
  Pencil,
  Plus,
  Send,
  Signature,
  Trash2,
  X,
} from "lucide-react";
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
  Segmented,
  SignaturePad,
} from "@/components/ui";
import { QuoteDoc, printNow } from "@/components/doc";
import { useStore, type Row } from "@/lib/store";
import { brl, fmtDate, mailLink, QUOTE_STATUS, waLink } from "@/lib/format";
import { compressImage } from "@/lib/images";

type Status = "aguardando" | "aprovado" | "faturado" | "recusado";
type Filter = Status | "todos";

const blankItem = () => ({ name: "", qty: 1, unit: 0 });

export default function OrcamentosPage() {
  const { data, mutate, settingsValue, notify } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [editing, setEditing] = useState<any | null>(null);
  const [printTarget, setPrintTarget] = useState<any | null>(null);

  // referências estáveis entre renders (evita recalcular os useMemo a cada render)
  const { quotes, clients } = useMemo(
    () => ({ quotes: data.quotes || [], clients: data.clients || [] }),
    [data],
  );
  const company = settingsValue("company", {} as any);
  const pdf = settingsValue("pdf", { conditions: "", footer: "", validity: 15 });

  const clientOf = (id?: number | null) => clients.find((c: any) => c.id === id);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return quotes
      .filter((x: any) => filter === "todos" || x.status === filter)
      .filter((x: any) => {
        if (!term) return true;
        const c = clients.find((cl: any) => cl.id === x.clientId);
        return (x.number + " " + (x.title || "") + " " + (c?.name || "")).toLowerCase().includes(term);
      })
      .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [quotes, filter, q, clients]);

  const nextNumber = () => {
    const max = quotes.reduce((a: number, x: any) => Math.max(a, Number(String(x.number).split("-").pop()) || 0), 0);
    return `ORC-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
  };

  const create = () => {
    const draft = {
      number: nextNumber(),
      clientId: clients[0]?.id ?? null,
      title: "",
      items: [blankItem()],
      subtotal: 0,
      discount: 0,
      feePercent: Number(settingsValue("fees", { cardPercent: 3.49 }).cardPercent) || 0,
      total: 0,
      status: "aguardando" as Status,
      validity: pdf.validity || 15,
      conditions: pdf.conditions,
      notes: "",
      signature: null,
      photos: [],
      createdAt: new Date().toISOString(),
    };
    // só grava quando o usuário salvar — antes, cancelar deixava orçamento vazio no banco
    setEditing({ ...draft });
  };

  const recalc = (draft: any) => {
    const subtotal = (draft.items || []).reduce((a: number, i: any) => a + Number(i.qty || 0) * Number(i.unit || 0), 0);
    const discount = Number(draft.discount || 0);
    const fee = Number(draft.feePercent || 0);
    const base = Math.max(0, subtotal - discount);
    const feeValue = fee > 0 ? (base / (1 - fee / 100)) * (fee / 100) : 0;
    return { subtotal, total: base + feeValue };
  };

  const save = async () => {
    if (!editing) return;
    const { subtotal, total } = recalc(editing);
    const payload = { ...editing, subtotal, total };
    if (editing.id) await mutate({ table: "quotes", op: "update", id: editing.id, data: payload });
    else {
      const row: any = await mutate({ table: "quotes", op: "create", data: payload });
      if (row?.id != null) payload.id = row.id;
    }
    notify(`${editing.number} salvo.`, "green");
    setEditing(null);
  };

  const setStatus = async (quote: any, status: Status) => {
    await mutate({ table: "quotes", op: "update", id: quote.id, data: { status } });
    notify(`${quote.number} agora está “${QUOTE_STATUS[status].label}”.`, status === "aprovado" ? "green" : "blue");
  };

  const shareWhats = (quote: any) => {
    const c = clientOf(quote.clientId);
    const msg =
      `Olá, ${c?.name?.split(" ")[0] || "tudo bem"}! Aqui é o Gabriel da GBR Soluções.\n\n` +
      `Orçamento ${quote.number} — ${quote.title || "serviços"}\n` +
      (quote.items || []).map((i: any) => `• ${i.qty}x ${i.name} — ${brl(Number(i.qty) * Number(i.unit))}`).join("\n") +
      `\n\nTotal: ${brl(quote.total)}\nValidade: ${quote.validity || 15} dias.\n\nFico à disposição para dúvidas.`;
    window.open(waLink(c?.phone, msg), "_blank");
  };

  const uploadPhotos = (files: FileList | null) => {
    if (!files || !editing) return;
    Array.from(files)
      .slice(0, 4)
      .forEach(async (f) => {
        try {
          const dataUrl = await compressImage(f, { maxSize: 1280, quality: 0.7 });
          setEditing((d: any) => ({ ...d, photos: [...(d.photos || []), dataUrl] }));
        } catch {
          notify(`${f.name} não pôde ser processada.`, "amber");
        }
      });
  };

  const counts = quotes.reduce((a: any, x: any) => ({ ...a, [x.status]: (a[x.status] || 0) + 1 }), {});

  return (
    <div>
      <PageHead
        eyebrow="Comercial"
        title="Orçamentos"
        subtitle="Do cálculo ao PDF assinado: mude o status, envie por WhatsApp ou e-mail e guarde as fotos do orçamento."
        actions={<AddButton onClick={create}>Novo orçamento</AddButton>}
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por número, cliente ou serviço…" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["todos", "aguardando", "aprovado", "faturado", "recusado"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className="btn h-9 px-4 text-[13px]"
              style={filter === f ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
              onClick={() => setFilter(f)}
            >
              {f === "todos" ? "Todos" : QUOTE_STATUS[f].label}
              <span className="tnum ml-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>
                {f === "todos" ? quotes.length : counts[f] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Send size={26} />}
            title={filter === "todos" ? "Nenhum orçamento ainda" : `Sem orçamentos “${QUOTE_STATUS[filter as Status]?.label}”`}
            hint="Monte um na calculadora ou comece do zero. O PDF sai formatado com o seu logo, validade e condições."
            action={<AddButton onClick={create}>Novo orçamento</AddButton>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((quote: any, idx: number) => {
            const c = clientOf(quote.clientId);
            const meta = QUOTE_STATUS[quote.status] || QUOTE_STATUS.aguardando;
            return (
              <Card key={quote.id} hover className="flex flex-col overflow-hidden rise" style={{ animationDelay: `${idx * 40}ms` }}>
                <button type="button" className="flex-1 p-5 text-left" onClick={() => setEditing({ ...quote, items: quote.items?.length ? quote.items : [blankItem()] })}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mono text-[12px]" style={{ color: "var(--text-3)" }}>{quote.number}</p>
                      <p className="mt-1 truncate text-[15.5px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
                        {quote.title || "Sem título"}
                      </p>
                      <p className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{c?.name || "Sem cliente"}</p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className="label">{(quote.items || []).length} item(ns)</span>
                      <p className="tnum mt-1 text-[26px] font-semibold" style={{ letterSpacing: "-0.03em" }}>
                        {brl(quote.total)}
                      </p>
                    </div>
                    <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{fmtDate(quote.createdAt)}</span>
                  </div>

                  {quote.signature && (
                    <p className="mt-3 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--green)" }}>
                      <Signature size={13} /> Assinado pelo cliente
                    </p>
                  )}
                </button>

                <div className="flex flex-wrap gap-1.5 px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--line)" }}>
                  <button className="btn h-8 px-3 text-[12.5px]" type="button" onClick={() => { setPrintTarget(quote); setTimeout(printNow, 140); }}>
                    <FileDown size={13} /> PDF
                  </button>
                  <button className="btn h-8 px-3 text-[12.5px]" type="button" onClick={() => shareWhats(quote)}>
                    <Send size={13} /> WhatsApp
                  </button>
                  <a
                    className="btn h-8 px-3 text-[12.5px]"
                    href={mailLink(
                      c?.email,
                      `Orçamento ${quote.number} — GBR Soluções`,
                      `Olá, ${c?.name || ""}!\n\nSegue o orçamento ${quote.number}: ${quote.title || ""}\nTotal: ${brl(quote.total)}\nValidade: ${quote.validity || 15} dias.\n\nAtenciosamente,\nGBR Soluções`,
                    )}
                  >
                    <Mail size={13} /> E-mail
                  </a>
                  <button className="btn btn-ghost h-8 px-3 text-[12.5px]" type="button" onClick={() => setEditing({ ...quote, items: quote.items?.length ? quote.items : [blankItem()] })}>
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* editor */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing ? `Orçamento ${editing.number}` : ""}
        footer={
          editing && (
            <>
              <DangerButton
                onConfirm={async () => {
                  await mutate({ table: "quotes", op: "delete", id: editing.id });
                  notify("Orçamento excluído.", "amber");
                  setEditing(null);
                }}
              />
              <button className="btn" type="button" onClick={() => { setPrintTarget({ ...editing }); setTimeout(printNow, 160); }}>
                <FileDown size={15} /> Gerar PDF
              </button>
              <button className="btn btn-primary" type="button" onClick={save}>Salvar alterações</button>
            </>
          )
        }
      >
        {editing && (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título do orçamento">
                <input className="input" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: CFTV 4 câmeras" />
              </Field>
              <Field label="Cliente">
                <select className="select" value={editing.clientId ?? ""} onChange={(e) => setEditing({ ...editing, clientId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Sem cliente</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Itens</Label>
                <button className="btn h-8 px-3 text-[12.5px]" type="button" onClick={() => setEditing({ ...editing, items: [...(editing.items || []), blankItem()] })}>
                  <Plus size={13} /> Adicionar item
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--line)" }}>
                {(editing.items || []).map((it: any, i: number) => {
                  const upd = (patch: any) =>
                    setEditing({ ...editing, items: editing.items.map((x: any, j: number) => (i === j ? { ...x, ...patch } : x)) });
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 p-3" style={{ borderBottom: "1px solid var(--line)", background: i % 2 ? "var(--panel-2)" : "var(--panel)" }}>
                      <input className="input col-span-12 sm:col-span-6" placeholder="Descrição do serviço" value={it.name} onChange={(e) => upd({ name: e.target.value })} />
                      <input className="input col-span-3 sm:col-span-2 tnum" type="number" min={1} value={it.qty} onChange={(e) => upd({ qty: Number(e.target.value) })} aria-label="Quantidade" />
                      <input className="input col-span-5 sm:col-span-2 tnum" type="number" step="0.01" value={it.unit} onChange={(e) => upd({ unit: Number(e.target.value) })} aria-label="Unitário" />
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1">
                        <span className="tnum text-[13.5px] font-medium">{brl(Number(it.qty) * Number(it.unit))}</span>
                        <button
                          className="btn btn-ghost h-7 w-7 rounded-full p-0"
                          type="button"
                          aria-label="Remover item"
                          onClick={() => setEditing({ ...editing, items: editing.items.filter((_: any, j: number) => i !== j) })}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Desconto (R$)">
                <input className="input tnum" type="number" value={editing.discount || 0} onChange={(e) => setEditing({ ...editing, discount: Number(e.target.value) })} />
              </Field>
              <Field label="Taxa cartão (%)">
                <input className="input tnum" type="number" step="0.01" value={editing.feePercent || 0} onChange={(e) => setEditing({ ...editing, feePercent: Number(e.target.value) })} />
              </Field>
              <Field label="Validade (dias)">
                <input className="input tnum" type="number" value={editing.validity || 15} onChange={(e) => setEditing({ ...editing, validity: Number(e.target.value) })} />
              </Field>
              <Field label="Status">
                <select className="select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {Object.entries(QUOTE_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <Label>Total calculado</Label>
                  <p className="tnum mt-1.5 text-[34px] font-semibold" style={{ letterSpacing: "-0.035em" }}>
                    {brl(recalc(editing).total)}
                  </p>
                  <p className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
                    Subtotal {brl(recalc(editing).subtotal)}
                    {Number(editing.feePercent) > 0 ? ` · com ${editing.feePercent}% de cartão` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["aguardando", "aprovado", "faturado", "recusado"] as Status[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn h-8 px-3 text-[12.5px]"
                      style={editing.status === s ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
                      onClick={() => setEditing({ ...editing, status: s })}
                    >
                      {QUOTE_STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Condições de pagamento" hint="Entra no rodapé do PDF">
                <textarea className="textarea" rows={3} value={editing.conditions || ""} onChange={(e) => setEditing({ ...editing, conditions: e.target.value })} />
              </Field>
              <Field label="Observações internas" hint="Não aparece no PDF">
                <textarea className="textarea" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label className="mb-2">Assinatura digital</Label>
                <SignaturePad value={editing.signature} onChange={(v) => setEditing({ ...editing, signature: v })} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Fotos do orçamento</Label>
                  <label className="btn h-8 px-3 text-[12.5px] cursor-pointer">
                    <ImagePlus size={13} /> Enviar
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(editing.photos || []).map((p: string, i: number) => (
                    <div key={i} className="relative overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto comprimida pelo usuário (data URL), não passa pelo otimizador do Next */}
                      <img src={p} alt={`Foto ${i + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remover foto"
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: "rgba(0,0,0,.62)", color: "#fff" }}
                        onClick={() => setEditing({ ...editing, photos: editing.photos.filter((_: any, j: number) => i !== j) })}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {!(editing.photos || []).length && (
                    <p className="col-span-3 text-[13px]" style={{ color: "var(--text-3)" }}>
                      Nenhuma foto anexada. Use fotos do local para justificar o valor.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2">Envio rápido</Label>
              <div className="flex flex-wrap gap-2">
                <button className="btn" type="button" onClick={() => shareWhats(editing)}>
                  <Send size={14} /> Enviar por WhatsApp
                </button>
                <a
                  className="btn"
                  href={mailLink(clientOf(editing.clientId)?.email, `Orçamento ${editing.number}`, `Olá!\n\nSegue o orçamento ${editing.number}: ${editing.title || ""}\nTotal: ${brl(recalc(editing).total)}\n\nGBR Soluções`)}
                >
                  <Mail size={14} /> Enviar por e-mail
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {printTarget && (
        <QuoteDoc
          quote={{ ...printTarget, total: recalc(printTarget).total, subtotal: recalc(printTarget).subtotal }}
          client={clientOf(printTarget.clientId)}
          company={company}
          conditions={pdf.conditions}
          footer={pdf.footer}
        />
      )}
    </div>
  );
}
