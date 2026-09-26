"use client";

import { useState } from "react";
import { FileSignature, FileText, Receipt, ScrollText, FileDown } from "lucide-react";
import { Card, Field, Label, PageHead, SignaturePad, EmptyState } from "@/components/ui";
import { LaudoDoc, QuoteDoc, ReceiptDoc, ReportDoc, printNow } from "@/components/doc";
import { useStore } from "@/lib/store";
import { brl, isoDay } from "@/lib/format";

type Kind = "orcamento" | "recibo" | "laudo" | "relatorio";

const TABS: { key: Kind; label: string; hint: string; icon: typeof FileText }[] = [
  { key: "orcamento", label: "Orçamento avulso", hint: "Documento simples, sem vínculo com o cadastro", icon: FileText },
  { key: "recibo", label: "Recibo", hint: "Comprovante de pagamento recebido", icon: Receipt },
  { key: "laudo", label: "Laudo técnico", hint: "Relatório técnico assinado", icon: ScrollText },
  { key: "relatorio", label: "Relatório mensal", hint: "Faturamento e movimentações da empresa", icon: FileSignature },
];

export default function DocumentosPage() {
  const { data, settingsValue, notify } = useStore();
  const [kind, setKind] = useState<Kind>("orcamento");
  const [printing, setPrinting] = useState<Kind | null>(null);

  const company = settingsValue("company", {} as any);
  const pdf = settingsValue("pdf", { footer: "", conditions: "", validity: 15 });
  const clients = data.clients || [];
  const quotes = data.quotes || [];
  const finance = data.finance || [];
  const goals = settingsValue("goals", { monthly: 8000 });

  const [quoteId, setQuoteId] = useState<number | "">("");
  const [received, setReceived] = useState<number>(0);
  const [month, setMonth] = useState(isoDay(new Date()).slice(0, 7));
  const [laudo, setLaudo] = useState({
    number: `LAU-${new Date().getFullYear()}-0001`,
    date: isoDay(new Date()),
    client: "",
    address: "",
    phone: "",
    objective: "Avaliação técnica do sistema elétrico predial do endereço indicado.",
    methodology: "Inspeção visual, testes de continuidade, medição de tensão e verificação de proteções (disjuntores e DR).",
    findings: "",
    opinion: "",
    recommendations: "",
    signature: null as string | null,
  });

  const quote = quotes.find((q: any) => q.id === quoteId) || null;
  const client = quote ? clients.find((c: any) => c.id === quote.clientId) : null;

  const monthRows = finance
    .filter((f: any) => String(f.entryDate).slice(0, 7) === month)
    .sort((a: any, b: any) => +new Date(a.entryDate) - +new Date(b.entryDate));
  const totals = {
    in: monthRows.filter((f: any) => f.kind === "in").reduce((a: number, f: any) => a + Number(f.amount), 0),
    out: monthRows.filter((f: any) => f.kind === "out").reduce((a: number, f: any) => a + Number(f.amount), 0),
    goal: Number(goals.monthly) || 8000,
  };

  const generate = () => {
    if (kind === "orcamento" && !quote) return notify("Escolha um orçamento para emitir.", "amber");
    if (kind === "recibo" && !quote) return notify("Escolha o orçamento que gerou o recebimento.", "amber");
    if (kind === "relatorio" && monthRows.length === 0) return notify("Não há movimentações neste mês.", "amber");
    setPrinting(kind);
    setTimeout(printNow, 200);
  };

  return (
    <div>
      <PageHead
        eyebrow="Papelada"
        title="Documentos"
        subtitle="Gere orçamentos avulsos, recibos, laudos técnicos e o relatório mensal da empresa — todos em PDF com assinatura digital."
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card className="overflow-hidden rise">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = kind === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition"
                  style={{ borderBottom: "1px solid var(--line)", background: on ? "var(--accentSoft)" : "transparent" }}
                  onClick={() => setKind(t.key)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: on ? "var(--accent)" : "var(--grey-soft)", color: on ? "#fff" : "var(--text-2)" }}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium" style={{ color: on ? "var(--accent)" : "var(--text)" }}>{t.label}</span>
                    <span className="block truncate text-[12.5px]" style={{ color: "var(--text-3)" }}>{t.hint}</span>
                  </span>
                </button>
              );
            })}
          </Card>

          <Card
            className="relative mt-4 overflow-hidden p-5 rise"
            style={{ animationDelay: "60ms" }}
          >
            <img
              src="images/paper.jpg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ opacity: 0.5, maskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), transparent 75%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), transparent 75%)" }}
            />
            <div className="relative">
            <Label>Como funciona</Label>
            <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              O documento é gerado no padrão A4 e enviado à impressão do navegador — escolha <strong>Salvar como PDF</strong> para
              guardar o arquivo. O logo, os dados da empresa, as condições e o rodapé vêm das Configurações.
            </p>
            <button className="btn btn-primary mt-4 w-full" type="button" onClick={generate}>
              <FileDown size={16} /> Gerar PDF
            </button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="p-6 rise" style={{ animationDelay: "90ms" }}>
            {kind === "orcamento" && (
              <div className="grid gap-4">
                <div>
                  <Label className="mb-2">Orçamento de origem</Label>
                  <select className="select" value={quoteId} onChange={(e) => setQuoteId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Selecione…</option>
                    {quotes.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.number} — {q.title || "sem título"}</option>
                    ))}
                  </select>
                  {!quotes.length && <p className="mt-2 text-[13px]" style={{ color: "var(--text-3)" }}>Nenhum orçamento cadastrado ainda.</p>}
                </div>
                {quote && (
                  <div className="rounded-2xl p-5" style={{ background: "var(--bg)" }}>
                    <p className="text-[16px] font-semibold">{quote.title || "Serviços"}</p>
                    <p className="text-[13.5px]" style={{ color: "var(--text-2)" }}>{client?.name || "Sem cliente"}</p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
                      <span>Itens: <strong className="tnum">{(quote.items || []).length}</strong></span>
                      <span>Validade: <strong className="tnum">{quote.validity || pdf.validity} dias</strong></span>
                      <span>Total: <strong className="tnum">{brl(quote.total)}</strong></span>
                      <span>Status: <strong>{quote.status}</strong></span>
                    </div>
                    {quote.signature && <p className="mt-3 text-[12.5px]" style={{ color: "var(--green)" }}>✓ com assinatura anexada</p>}
                  </div>
                )}
              </div>
            )}

            {kind === "recibo" && (
              <div className="grid gap-4">
                <Field label="Orçamento relacionado">
                  <select className="select" value={quoteId} onChange={(e) => setQuoteId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Selecione…</option>
                    {quotes.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.number} — {q.title || "sem título"}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Valor recebido (R$)" hint={quote ? `Total do orçamento: ${brl(quote.total)}` : undefined}>
                    <input
                      className="input tnum"
                      type="number"
                      step="0.01"
                      value={received || Number(quote?.total || 0)}
                      onChange={(e) => setReceived(Number(e.target.value))}
                    />
                  </Field>
                  <div className="rounded-2xl p-4" style={{ background: "var(--bg)" }}>
                    <Label>Cliente</Label>
                    <p className="mt-2 text-[14px]">{client?.name || "—"}</p>
                    <p className="text-[12.5px]" style={{ color: "var(--text-2)" }}>{client?.document || company?.document}</p>
                  </div>
                </div>
              </div>
            )}

            {kind === "laudo" && (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Número">
                    <input className="input mono" value={laudo.number} onChange={(e) => setLaudo({ ...laudo, number: e.target.value })} />
                  </Field>
                  <Field label="Data">
                    <input className="input" type="date" value={laudo.date} onChange={(e) => setLaudo({ ...laudo, date: e.target.value })} />
                  </Field>
                  <Field label="Telefone">
                    <input className="input" value={laudo.phone} onChange={(e) => setLaudo({ ...laudo, phone: e.target.value })} placeholder="(11) 99999-0000" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cliente">
                    <input className="input" value={laudo.client} onChange={(e) => setLaudo({ ...laudo, client: e.target.value })} />
                  </Field>
                  <Field label="Endereço inspecionado">
                    <input className="input" value={laudo.address} onChange={(e) => setLaudo({ ...laudo, address: e.target.value })} />
                  </Field>
                </div>
                <Field label="Objeto">
                  <textarea className="textarea" rows={2} value={laudo.objective} onChange={(e) => setLaudo({ ...laudo, objective: e.target.value })} />
                </Field>
                <Field label="Metodologia">
                  <textarea className="textarea" rows={3} value={laudo.methodology} onChange={(e) => setLaudo({ ...laudo, methodology: e.target.value })} />
                </Field>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Constatações">
                    <textarea className="textarea" rows={4} value={laudo.findings} onChange={(e) => setLaudo({ ...laudo, findings: e.target.value })} placeholder="O que foi observado no local…" />
                  </Field>
                  <Field label="Parecer técnico">
                    <textarea className="textarea" rows={4} value={laudo.opinion} onChange={(e) => setLaudo({ ...laudo, opinion: e.target.value })} placeholder="Conclusão do responsável técnico…" />
                  </Field>
                </div>
                <Field label="Recomendações">
                  <textarea className="textarea" rows={3} value={laudo.recommendations} onChange={(e) => setLaudo({ ...laudo, recommendations: e.target.value })} />
                </Field>
                <div>
                  <Label className="mb-2">Assinatura do responsável</Label>
                  <SignaturePad value={laudo.signature} onChange={(v) => setLaudo({ ...laudo, signature: v })} height={150} />
                </div>
              </div>
            )}

            {kind === "relatorio" && (
              <div className="grid gap-4">
                <Field label="Competência">
                  <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Box label="Entradas" value={brl(totals.in)} tone="var(--green)" />
                  <Box label="Saídas" value={brl(totals.out)} tone="var(--red)" />
                  <Box label="Resultado" value={brl(totals.in - totals.out)} />
                </div>
                <div className="rounded-2xl p-4" style={{ background: "var(--bg)" }}>
                  <Label className="mb-2">Movimentações incluídas</Label>
                  {monthRows.length === 0 ? (
                    <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>Nenhuma movimentação neste mês.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto pr-1">
                      {monthRows.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between py-1.5 text-[13.5px]" style={{ borderBottom: "1px solid var(--line)" }}>
                          <span className="truncate" style={{ color: "var(--text-2)" }}>{f.description}</span>
                          <span className="tnum" style={{ color: f.kind === "in" ? "var(--green)" : "var(--red)" }}>
                            {f.kind === "in" ? "" : "− "}
                            {brl(f.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" type="button" onClick={generate}>
                  <FileDown size={16} /> Gerar relatório em PDF
                </button>
              </div>
            )}

            {kind === "orcamento" && (
              <div className="mt-5 flex flex-wrap items-center gap-3 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                <button className="btn btn-primary" type="button" onClick={generate}>
                  <FileDown size={16} /> Gerar PDF do orçamento
                </button>
                <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                  Validade padrão {pdf.validity} dias · condições em Configurações
                </span>
              </div>
            )}
            {kind === "recibo" && (
              <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                <button className="btn btn-primary" type="button" onClick={generate}>
                  <FileDown size={16} /> Gerar recibo em PDF
                </button>
              </div>
            )}
          </Card>

          {!quotes.length && kind !== "relatorio" && kind !== "laudo" && (
            <Card className="mt-4">
              <EmptyState
                icon={<FileText size={26} />}
                title="Sem orçamentos para usar"
                hint="Crie um orçamento na Calculadora ou na aba Orçamentos para emitir documentos a partir dele."
              />
            </Card>
          )}
        </div>
      </div>

      {printing === "orcamento" && quote && (
        <QuoteDoc quote={quote} client={client} company={company} conditions={pdf.conditions} footer={pdf.footer} />
      )}
      {printing === "recibo" && quote && (
        <ReceiptDoc quote={quote} client={client} company={company} footer={pdf.footer} received={received || Number(quote.total)} />
      )}
      {printing === "laudo" && <LaudoDoc data={laudo} company={company} footer={pdf.footer} />}
      {printing === "relatorio" && (
        <ReportDoc
          month={month}
          rows={monthRows}
          totals={totals}
          company={company}
          footer={pdf.footer}
        />
      )}
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: "var(--bg)", border: "1px solid var(--line)" }}>
      <p className="label mb-1.5">{label}</p>
      <p className="tnum text-[17px] font-semibold" style={{ color: tone || "var(--text)" }}>{value}</p>
    </div>
  );
}
