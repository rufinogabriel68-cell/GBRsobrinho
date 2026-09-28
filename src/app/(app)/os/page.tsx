"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Copy,
  ExternalLink,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Wrench,
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
  SignaturePad,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { brl, fmtDateTime, fmtTime, fmtDate, ORDER_STATUS, uid } from "@/lib/format";

type Draft = any;

const blank = (orders: any[]) => {
  const max = orders.reduce((a: number, x: any) => Math.max(a, Number(String(x.number).split("-").pop()) || 0), 0);
  return {
    number: `OS-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`,
    token: `gbr-${uid()}${uid().slice(0, 4)}`,
    clientId: null,
    title: "",
    description: "",
    status: "aberta",
    scheduledAt: new Date().toISOString().slice(0, 16),
    address: "",
    total: 0,
    costMaterials: 0,
    costTravel: 0,
    costLabor: 0,
    serviceIds: [],
    stockUsed: [],
    observations: "",
    signature: null,
  };
};

export default function OrdensPage() {
  const { data, mutate, notify } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("todas");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [chat, setChat] = useState<any | null>(null);
  const [msg, setMsg] = useState("");
  const [copyId, setCopyId] = useState<number | null>(null);

  // referências estáveis entre renders (evita recalcular os useMemo a cada render)
  const { orders, clients, services, stock, messages } = useMemo(
    () => ({
      orders: data.orders || [],
      clients: data.clients || [],
      services: data.services || [],
      stock: data.stock || [],
      messages: data.orderMessages || [],
    }),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders
      .filter((o: any) => filter === "todas" || o.status === filter)
      .filter((o: any) => {
        if (!term) return true;
        const c = clients.find((x: any) => x.id === o.clientId);
        return (o.number + " " + o.title + " " + (c?.name || "") + " " + (o.address || "")).toLowerCase().includes(term);
      })
      .sort((a: any, b: any) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime());
  }, [orders, filter, q, clients]);

  const clientOf = (id?: number | null) => clients.find((c: any) => c.id === id);

  const save = async () => {
    if (!draft?.title.trim()) return notify("Dê um título para a ordem de serviço.", "amber");
    const prev = orders.find((o: any) => o.id === draft.id);
    const payload = { ...draft, total: Number(draft.total) || 0 };

    let id = draft.id;
    if (prev) {
      await mutate({ table: "orders", op: "update", id: prev.id, data: payload });
    } else {
      const row: any = await mutate({ table: "orders", op: "create", data: payload });
      id = row?.id;
    }

    // baixa automática de material no estoque
    const before = new Map<number, number>((prev?.stockUsed || []).map((s: any) => [s.id, Number(s.qty)]));
    for (const used of draft.stockUsed || []) {
      const delta = Number(used.qty) - (before.get(used.id) || 0);
      if (delta > 0) {
        await mutate({
          table: "stockMoves",
          op: "create",
          data: { stockId: used.id, type: "out", quantity: delta, note: `${draft.number} — ${draft.title}`, orderId: id },
        });
      }
    }

    notify(`${draft.number} salva.`, "green");
    setDraft(null);
  };

  const link = (o: any) => `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${o.token}`;

  const copy = async (o: any) => {
    try {
      await navigator.clipboard.writeText(link(o));
      setCopyId(o.id);
      setTimeout(() => setCopyId(null), 1800);
      notify("Link do cliente copiado.", "green");
    } catch {
      notify("Não foi possível copiar. Copie manualmente: " + link(o), "amber");
    }
  };

  const openChat = (o: any) => setChat(o);

  const sendChat = async () => {
    if (!msg.trim() || !chat) return;
    await mutate({ table: "orderMessages", op: "create", data: { orderId: chat.id, author: "gbr", body: msg.trim() } });
    setMsg("");
  };

  const counts = orders.reduce((a: any, o: any) => ({ ...a, [o.status]: (a[o.status] || 0) + 1 }), {});
  const chatMessages = chat ? messages.filter((m: any) => m.orderId === chat.id) : [];

  return (
    <div>
      <PageHead
        eyebrow="Operação"
        title="Ordens de Serviço"
        subtitle="Cada OS gera um link seguro para o cliente acompanhar o status, conversar e assinar — sem precisar de login."
        actions={<AddButton onClick={() => setDraft(blank(orders))}>Nova OS</AddButton>}
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar OS, cliente ou endereço…" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["todas", ...Object.keys(ORDER_STATUS)].map((f) => (
            <button
              key={f}
              type="button"
              className="btn h-9 px-3.5 text-[13px]"
              style={filter === f ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
              onClick={() => setFilter(f)}
            >
              {f === "todas" ? "Todas" : ORDER_STATUS[f].label}
              <span className="tnum ml-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>
                {f === "todas" ? orders.length : counts[f] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={26} />}
            title="Nenhuma ordem de serviço"
            hint="Crie uma OS, compartilhe o link com o cliente e acompanhe o andamento em tempo real."
            action={<AddButton onClick={() => setDraft(blank(orders))}>Nova OS</AddButton>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((o: any, i: number) => {
            const c = clientOf(o.clientId);
            const meta = ORDER_STATUS[o.status] || ORDER_STATUS.aberta;
            const custo = Number(o.costMaterials || 0) + Number(o.costTravel || 0) + Number(o.costLabor || 0);
            const msgs = messages.filter((m: any) => m.orderId === o.id);
            const last = msgs[msgs.length - 1];
            return (
              <Card key={o.id} hover className="overflow-hidden rise" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="grid gap-4 p-5 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-5">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[12px]" style={{ color: "var(--text-3)" }}>{o.number}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1.5 text-[16px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{o.title}</p>
                    <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                      {c?.name || "Sem cliente"}
                      {o.address ? ` · ${o.address}` : ""}
                    </p>
                    {last && (
                      <p className="mt-1.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: "var(--text-3)" }}>
                        <MessageSquare size={12} />
                        {last.author === "gbr" ? "Você" : "Cliente"}: {last.body}
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-3">
                    <Label>Agendamento</Label>
                    <p className="mt-1.5 text-[14px] font-medium">{o.scheduledAt ? fmtDate(o.scheduledAt, { weekday: "short", day: "2-digit", month: "short" }) : "—"}</p>
                    <p className="tnum text-[13px]" style={{ color: "var(--text-2)" }}>
                      {o.scheduledAt ? `${fmtTime(o.scheduledAt)} · ` : ""}≈ {Math.max(1, Math.round(Number(o.costLabor || 0) / 60))}h
                    </p>
                  </div>

                  <div className="lg:col-span-2">
                    <Label>Resultado</Label>
                    <p className="tnum mt-1.5 text-[18px] font-semibold">{brl(o.total)}</p>
                    <p className="tnum text-[12.5px]" style={{ color: custo > Number(o.total) ? "var(--red)" : "var(--green)" }}>
                      custo {brl(custo)} · lucro {brl(Number(o.total) - custo)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:col-span-2 lg:justify-end">
                    <button className="btn h-9 px-3 text-[12.5px]" type="button" onClick={() => copy(o)}>
                      {copyId === o.id ? <Copy size={13} style={{ color: "var(--green)" }} /> : <Copy size={13} />}
                      {copyId === o.id ? "Copiado" : "Link"}
                    </button>
                    <a className="btn h-9 px-3 text-[12.5px]" href={`/portal/${o.token}`} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} /> Portal
                    </a>
                    <button className="btn h-9 px-3 text-[12.5px]" type="button" onClick={() => openChat(o)}>
                      <MessageSquare size={13} />
                      {msgs.length ? <span className="tnum">{msgs.length}</span> : null}
                    </button>
                    <button className="btn btn-ghost h-9 px-3 text-[12.5px]" type="button" onClick={() => setDraft({ ...o, scheduledAt: o.scheduledAt ? new Date(o.scheduledAt).toISOString().slice(0, 16) : "" })}>
                      <Pencil size={13} /> Editar
                    </button>
                  </div>
                </div>

                {/* barra de progresso de status */}
                <div className="px-5 pb-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className="h-1.5 flex-1 rounded-full transition-all duration-500"
                        style={{ background: meta.step >= step && meta.step >= 0 ? "var(--accent)" : "var(--grey-soft)", opacity: meta.step < 0 ? 0.4 : 1 }}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* editor de OS */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        title={draft ? `${draft.number} · ${draft.id ? "editar" : "nova ordem de serviço"}` : ""}
        footer={
          draft && (
            <>
              {draft.id && (
                <DangerButton
                  label="Excluir OS"
                  onConfirm={async () => {
                    await mutate({ table: "orders", op: "delete", id: draft.id });
                    notify("OS excluída.", "amber");
                    setDraft(null);
                  }}
                />
              )}
              <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
              <button className="btn btn-primary" type="button" onClick={save}>Salvar OS</button>
            </>
          )
        }
      >
        {draft && (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título do serviço">
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Instalação de 3 tomadas" autoFocus />
              </Field>
              <Field label="Cliente">
                <select className="select" value={draft.clientId ?? ""} onChange={(e) => setDraft({ ...draft, clientId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Sem cliente</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Descrição do trabalho">
              <textarea className="textarea" rows={3} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="O que será feito, detalhes do local…" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status">
                <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  {Object.entries(ORDER_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data e hora">
                <input className="input" type="datetime-local" value={draft.scheduledAt || ""} onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })} />
              </Field>
              <Field label="Endereço">
                <input className="input" value={draft.address || ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Rua, número, bairro" />
              </Field>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
              <div className="mb-3 flex items-center justify-between">
                <Label>Serviços vinculados</Label>
                <span className="text-[12.5px]" style={{ color: "var(--text-2)" }}>{(draft.serviceIds || []).length} selecionado(s)</span>
              </div>
              <div className="grid max-h-44 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {services.map((s: any) => {
                  const on = (draft.serviceIds || []).includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition"
                      style={{ background: on ? "var(--accentSoft)" : "var(--panel)", border: "1px solid var(--line)" }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            serviceIds: on ? draft.serviceIds.filter((x: number) => x !== s.id) : [...(draft.serviceIds || []), s.id],
                          })
                        }
                      />
                      <span className="truncate">{s.name}</span>
                      <span className="tnum ml-auto text-[12.5px]" style={{ color: "var(--text-2)" }}>{brl(s.priceMed)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
                <Label className="mb-3">Custos da OS</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor cobrado">
                    <input className="input tnum" type="number" value={draft.total || 0} onChange={(e) => setDraft({ ...draft, total: Number(e.target.value) })} />
                  </Field>
                  <Field label="Mão de obra">
                    <input className="input tnum" type="number" value={draft.costLabor || 0} onChange={(e) => setDraft({ ...draft, costLabor: Number(e.target.value) })} />
                  </Field>
                  <Field label="Materiais">
                    <input className="input tnum" type="number" value={draft.costMaterials || 0} onChange={(e) => setDraft({ ...draft, costMaterials: Number(e.target.value) })} />
                  </Field>
                  <Field label="Deslocamento">
                    <input className="input tnum" type="number" value={draft.costTravel || 0} onChange={(e) => setDraft({ ...draft, costTravel: Number(e.target.value) })} />
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-between text-[13.5px]">
                  <span style={{ color: "var(--text-2)" }}>Margem estimada</span>
                  <span className="tnum font-semibold" style={{ color: Number(draft.total) - (Number(draft.costMaterials) + Number(draft.costTravel) + Number(draft.costLabor)) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {brl(Number(draft.total) - (Number(draft.costMaterials) + Number(draft.costTravel) + Number(draft.costLabor)))}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
                <Label className="mb-3">Baixa de estoque automática</Label>
                <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
                  {stock.map((it: any) => {
                    const used = (draft.stockUsed || []).find((u: any) => u.id === it.id);
                    const qty = used ? Number(used.qty) : 0;
                    return (
                      <div key={it.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{it.name}</span>
                        <span className="mono text-[12px]" style={{ color: "var(--text-3)" }}>disp. {it.quantity}</span>
                        <input
                          className="input tnum h-8 w-16 px-2 text-center"
                          type="number"
                          min={0}
                          value={qty}
                          aria-label={`Quantidade de ${it.name}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const rest = (draft.stockUsed || []).filter((u: any) => u.id !== it.id);
                            setDraft({ ...draft, stockUsed: v > 0 ? [...rest, { id: it.id, qty: v }] : rest });
                          }}
                        />
                      </div>
                    );
                  })}
                  {!stock.length && <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Estoque vazio.</p>}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Observações internas">
                <textarea className="textarea" rows={3} value={draft.observations || ""} onChange={(e) => setDraft({ ...draft, observations: e.target.value })} />
              </Field>
              <div>
                <Label className="mb-2">Assinatura do cliente</Label>
                <SignaturePad value={draft.signature} onChange={(v) => setDraft({ ...draft, signature: v })} height={140} />
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ border: "1px dashed var(--line-strong)" }}>
              <Label>Link do portal do cliente</Label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="mono min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "var(--inset)" }}>
                  {draft.id ? link(draft) : `/portal/${draft.token} (gerado ao salvar)`}
                </code>
                <button className="btn" type="button" onClick={() => copy(draft)}>
                  <Copy size={14} /> Copiar link
                </button>
                {draft.id && (
                  <a className="btn" href={`/portal/${draft.token}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Abrir
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* chat */}
      <Modal
        open={!!chat}
        onClose={() => setChat(null)}
        title={chat ? `Conversa · ${chat.number}` : ""}
        footer={
          <div className="flex w-full gap-2">
            <input className="input flex-1" value={msg} placeholder="Escreva para o cliente…" onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} />
            <button className="btn btn-primary" type="button" onClick={sendChat}>
              <Send size={15} /> Enviar
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--inset)" }}>
            <div className="flex items-center gap-2 text-[13.5px]">
              <Wrench size={14} style={{ color: "var(--accent)" }} />
              <span className="font-medium">{chat?.title}</span>
            </div>
            <select
              className="select h-8 w-auto px-2 text-[13px]"
              value={chat?.status}
              onChange={async (e) => {
                await mutate({ table: "orders", op: "update", id: chat.id, data: { status: e.target.value } });
                setChat({ ...chat, status: e.target.value });
                notify("Status atualizado — o cliente já vê a mudança.", "green");
              }}
            >
              {Object.entries(ORDER_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {chatMessages.length === 0 && (
            <EmptyState icon={<MessageSquare size={26} />} title="Nenhuma mensagem ainda" hint="Combine os detalhes com o cliente pelo portal. Tudo fica salvo nesta conversa." />
          )}

          {chatMessages.map((m: any) => (
            <div
              key={m.id}
              className={m.author === "gbr" ? "self-end" : "self-start"}
              style={{ maxWidth: "84%" }}
            >
              <div
                className="rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed"
                style={{
                  background: m.author === "gbr" ? "var(--accent)" : "var(--inset)",
                  color: m.author === "gbr" ? "#fff" : "var(--text)",
                  border: m.author === "gbr" ? "none" : "1px solid var(--line)",
                  borderTopRightRadius: m.author === "gbr" ? 6 : undefined,
                  borderTopLeftRadius: m.author !== "gbr" ? 6 : undefined,
                }}
              >
                {m.body}
              </div>
              <p className="mt-1 px-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                {m.author === "gbr" ? "Você" : "Cliente"} · {fmtDateTime(m.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      {/* atalhos de status na listagem: alterar rapidamente */}
      <div className="sr-only" aria-hidden>
        <MapPin size={1} />
      </div>
    </div>
  );
}
