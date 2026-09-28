"use client";

import { useMemo, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search, Tag, Users } from "lucide-react";
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
import { useStore, type Row } from "@/lib/store";
import { brl, fmtDate, mailLink, QUOTE_STATUS, waLink, ORDER_STATUS } from "@/lib/format";

const ALL_TAGS = ["recorrente", "novo", "comercial", "indicou", "contrato", "CFTV", "automação"];

type Draft = any;

export default function ClientesPage() {
  const { data, mutate, notify } = useStore();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("todas");
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // referências estáveis entre renders (evita recalcular os useMemo a cada render)
  const { clients, quotes, orders } = useMemo(
    () => ({
      clients: data.clients || [],
      quotes: data.quotes || [],
      orders: data.orders || [],
    }),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c: any) => {
      const okTag = tag === "todas" || (c.tags || []).includes(tag);
      const okTerm = !term || `${c.name} ${c.phone || ""} ${c.email || ""} ${c.city || ""}`.toLowerCase().includes(term);
      return okTag && okTerm;
    });
  }, [clients, q, tag]);

  const detail = clients.find((c: any) => c.id === selected) || null;
  const history = detail
    ? {
        quotes: quotes.filter((x: any) => x.clientId === detail.id),
        orders: orders.filter((x: any) => x.clientId === detail.id),
      }
    : { quotes: [], orders: [] };

  const lifetime = (id: number) =>
    quotes
      .filter((q2: any) => q2.clientId === id && ["aprovado", "faturado"].includes(q2.status))
      .reduce((a: number, q2: any) => a + Number(q2.total || 0), 0);

  const save = async () => {
    if (!draft?.name.trim()) return;
    const payload = { ...draft, name: draft.name.trim(), tags: draft.tags || [] };
    if (draft.id) await mutate({ table: "clients", op: "update", id: draft.id, data: payload });
    else await mutate({ table: "clients", op: "create", data: payload });
    notify("Cliente salvo.", "green");
    setDraft(null);
  };

  const tags = [...new Set(clients.flatMap((c: any) => c.tags || []))];

  return (
    <div>
      <PageHead
        eyebrow="CRM"
        title="Clientes"
        subtitle="Cadastro completo com histórico de orçamentos e ordens de serviço, tags e contato direto no WhatsApp."
        actions={
          <AddButton onClick={() => setDraft({ name: "", phone: "", email: "", address: "", city: "São Paulo", tags: ["novo"], notes: "" })}>
            Novo cliente
          </AddButton>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar nome, telefone ou bairro…" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["todas", ...ALL_TAGS, ...tags.filter((t) => !ALL_TAGS.includes(t))].map((t) => (
            <button
              key={t}
              type="button"
              className="btn h-9 px-3.5 text-[13px] capitalize"
              style={tag === t ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
              onClick={() => setTag(t)}
            >
              {t === "todas" ? "Todos" : t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={26} />}
            title="Nenhum cliente encontrado"
            hint="Cadastre quem já contratou você. O histórico de orçamentos e OS aparece automaticamente na ficha."
            action={<AddButton onClick={() => setDraft({ name: "", phone: "", email: "", address: "", city: "São Paulo", tags: ["novo"], notes: "" })}>Novo cliente</AddButton>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any, i: number) => (
            <Card key={c.id} hover className="rise overflow-hidden" style={{ animationDelay: `${i * 35}ms` }}>
              <button type="button" className="w-full p-5 text-left" onClick={() => setSelected(c.id)}>
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                    style={{ background: "var(--accentSoft)", color: "var(--accent)" }}
                  >
                    {c.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{c.name}</p>
                    <p className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{c.phone || "sem telefone"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.tags || []).map((t: string) => (
                        <Badge key={t} tone={t === "recorrente" ? "green" : t === "novo" ? "blue" : "grey"} dot={false}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Orçamentos" value={String(quotes.filter((x: any) => x.clientId === c.id).length)} />
                  <Mini label="OS" value={String(orders.filter((x: any) => x.clientId === c.id).length)} />
                  <Mini label="Faturado" value={brl(lifetime(c.id))} />
                </div>
              </button>
              <div className="flex gap-2 px-4 pb-4">
                <a className="btn h-9 flex-1 px-3 text-[12.5px]" href={waLink(c.phone, `Olá, ${c.name.split(" ")[0]}! Aqui é o Gabriel da GBR Soluções.`)} target="_blank" rel="noreferrer">
                  <Phone size={13} /> WhatsApp
                </a>
                <button className="btn h-9 px-3 text-[12.5px]" type="button" onClick={() => setDraft({ ...c })}>
                  <Pencil size={13} /> Editar
                </button>
                <DangerButton
                  onConfirm={async () => {
                    await mutate({ table: "clients", op: "delete", id: c.id });
                    notify("Cliente removido.", "amber");
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ficha do cliente */}
      <Modal
        open={!!detail}
        onClose={() => setSelected(null)}
        wide
        title={detail?.name || ""}
        footer={
          detail && (
            <>
              <DangerButton
                onConfirm={async () => {
                  await mutate({ table: "clients", op: "delete", id: detail.id });
                  notify("Cliente removido.", "amber");
                  setSelected(null);
                }}
              />
              <button className="btn" type="button" onClick={() => setDraft({ ...detail })}>Editar cadastro</button>
              <a className="btn btn-primary" href={waLink(detail.phone, `Olá, ${detail.name.split(" ")[0]}! Tudo bem? Aqui é o Gabriel da GBR Soluções.`)} target="_blank" rel="noreferrer">
                <Phone size={15} /> Chamar no WhatsApp
              </a>
            </>
          )
        }
      >
        {detail && (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <Label>Telefone</Label>
                <p className="mt-2 flex items-center gap-2 text-[14px]"><Phone size={14} style={{ color: "var(--accent)" }} /> {detail.phone || "—"}</p>
              </Card>
              <Card className="p-4">
                <Label>E-mail</Label>
                <p className="mt-2 flex items-center gap-2 truncate text-[14px]"><Mail size={14} style={{ color: "var(--accent)" }} /> {detail.email || "—"}</p>
              </Card>
              <Card className="p-4">
                <Label>Endereço</Label>
                <p className="mt-2 flex items-center gap-2 text-[14px]"><MapPin size={14} style={{ color: "var(--accent)" }} /> {detail.address || "—"}</p>
              </Card>
            </div>

            {detail.notes && (
              <div className="rounded-2xl p-4" style={{ background: "var(--inset)" }}>
                <Label className="mb-2">Observações</Label>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>{detail.notes}</p>
              </div>
            )}

            <div>
              <Label className="mb-2">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((t) => {
                  const on = (detail.tags || []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className="btn h-8 px-3 text-[12.5px] capitalize"
                      style={on ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
                      onClick={async () => {
                        const next = on ? detail.tags.filter((x: string) => x !== t) : [...(detail.tags || []), t];
                        await mutate({ table: "clients", op: "update", id: detail.id, data: { tags: next } });
                        setSelected(detail.id);
                      }}
                    >
                      <Tag size={12} /> {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <Label className="mb-2">Histórico de orçamentos</Label>
                {history.quotes.length === 0 ? (
                  <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>Nenhum orçamento para este cliente.</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--line)" }}>
                    {history.quotes.map((x: any) => (
                      <div key={x.id} className="row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium">{x.title || x.number}</span>
                          <span className="mono text-[11.5px]" style={{ color: "var(--text-3)" }}>{x.number} · {fmtDate(x.createdAt)}</span>
                        </span>
                        <span className="tnum text-[13.5px]">{brl(x.total)}</span>
                        <Badge tone={QUOTE_STATUS[x.status]?.tone}>{QUOTE_STATUS[x.status]?.label}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2">Histórico de ordens de serviço</Label>
                {history.orders.length === 0 ? (
                  <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>Nenhuma OS para este cliente.</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--line)" }}>
                    {history.orders.map((x: any) => (
                      <div key={x.id} className="row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium">{x.title}</span>
                          <span className="mono text-[11.5px]" style={{ color: "var(--text-3)" }}>{x.number} · {fmtDate(x.scheduledAt)}</span>
                        </span>
                        <span className="tnum text-[13.5px]">{brl(x.total)}</span>
                        <Badge tone={ORDER_STATUS[x.status]?.tone}>{ORDER_STATUS[x.status]?.label}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                className="btn"
                href={waLink(
                  detail.phone,
                  `Olá, ${detail.name.split(" ")[0]}! Passando para saber como foi o serviço da GBR Soluções. Tudo certo por aí? Sua avaliação ajuda muito 🙌`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Pesquisa de satisfação
              </a>
              <a className="btn" href={mailLink(detail.email, "Lembrete de manutenção — GBR Soluções", "Olá! A manutenção do seu sistema está próxima. Vamos agendar?")} target="_blank" rel="noreferrer">
                <Mail size={14} /> Lembrete por e-mail
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* cadastro */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar cliente" : "Novo cliente"}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={save}>Salvar</button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4">
            <Field label="Nome / razão social">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Mariana Alcântara" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp / telefone">
                <input className="input" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(11) 99999-0000" />
              </Field>
              <Field label="E-mail">
                <input className="input" type="email" value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email@provedor.com" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Endereço">
                <input className="input" value={draft.address || ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Rua, número" />
              </Field>
              <Field label="Cidade / bairro">
                <input className="input" value={draft.city || ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Observações">
              <textarea className="textarea" rows={3} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Preferências, horários, detalhes do local…" />
            </Field>
            <Field label="Tags">
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((t) => {
                  const on = (draft.tags || []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className="btn h-8 px-3 text-[12.5px] capitalize"
                      style={on ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tags: on ? draft.tags.filter((x: string) => x !== t) : [...(draft.tags || []), t],
                        })
                      }
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-2 py-2" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
      <p className="label truncate">{label}</p>
      <p className="tnum mt-1 truncate text-[13.5px] font-semibold">{value}</p>
    </div>
  );
}
