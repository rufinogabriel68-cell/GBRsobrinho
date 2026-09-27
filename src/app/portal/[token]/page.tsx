"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleDot,
  MessageSquare,
  Phone,
  Send,
  Signature,
  Mail,
} from "lucide-react";
import { BrandMark } from "@/components/shell";
import { SignaturePad, Badge } from "@/components/ui";
import { brl, fmtDate, fmtDateTime, fmtTime, ORDER_STATUS, waLink } from "@/lib/format";

type Payload = {
  ok: boolean;
  order?: any;
  client?: any;
  messages?: any[];
  error?: string;
};

const STEPS = [
  { key: "aberta", label: "Recebida" },
  { key: "agendada", label: "Agendada" },
  { key: "em_andamento", label: "Em execução" },
  { key: "concluida", label: "Concluída" },
];

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [data, setData] = useState<Payload | null>(null);
  const [msg, setMsg] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) {
        setData({ ok: false, error: "Link inválido ou sem conexão." });
        return;
      }
      const json = (await res.json()) as Payload;
      setData(json);
      setSig(json.order?.signature ?? null);
    } catch {
      setData((current) => current ?? { ok: false, error: "Sem conexão. Verifique sua internet." });
    }
  }, [token]);

  // primeira carga e atualização automática a cada 12s (só com a aba visível)
  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 12000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data?.messages?.length]);

  const post = async (body: any) => {
    setSending(true);
    const res = await fetch(`/api/portal/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      const json = await res.json();
      setData(json);
    }
  };

  if (!data) {
    return (
      <Shell>
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--text-2)" }}>
          Carregando sua ordem de serviço…
        </div>
      </Shell>
    );
  }

  if (!data.ok || !data.order) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-20 text-center">
          <BrandMark size={54} />
          <h1 className="mt-6 text-[24px] font-semibold" style={{ letterSpacing: "-0.03em" }}>Link inválido</h1>
          <p className="mt-2 text-[14.5px]" style={{ color: "var(--text-2)" }}>
            Este link expirou ou foi revogado. Peça um novo ao prestador de serviço.
          </p>
          <a className="btn btn-primary mt-6" href="https://wa.me/5511988423310" target="_blank" rel="noreferrer">
            <Phone size={16} /> Falar com a GBR Soluções
          </a>
        </div>
      </Shell>
    );
  }

  const order = data.order;
  const client = data.client;
  const messages = data.messages || [];
  const meta = ORDER_STATUS[order.status] || ORDER_STATUS.aberta;
  const currentStep = meta.step;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="rise mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={38} />
            <div>
              <p className="text-[15px] font-semibold">GBR Soluções</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Acompanhamento da sua ordem de serviço</p>
            </div>
          </div>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        <div className="grid gap-4">
          {/* cabeçalho da OS */}
          <div className="card overflow-hidden rise" style={{ animationDelay: "60ms" }}>
            <div className="p-6">
              <p className="mono text-[12px]" style={{ color: "var(--text-3)" }}>{order.number}</p>
              <h1 className="mt-1.5 text-[26px] font-semibold leading-tight" style={{ letterSpacing: "-0.03em" }}>
                {order.title}
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {order.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Info label="Quando" value={order.scheduledAt ? `${fmtDate(order.scheduledAt)} · ${fmtTime(order.scheduledAt)}` : "A combinar"} />
                <Info label="Onde" value={order.address || "A combinar"} />
                <Info label="Valor do serviço" value={brl(order.total)} strong />
              </div>
            </div>

            {/* linha do tempo */}
            <div className="px-6 pb-6">
              <div className="flex items-center">
                {STEPS.map((s, i) => {
                  const done = currentStep >= i;
                  return (
                    <div key={s.key} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full transition"
                          style={{
                            background: done ? "var(--accent)" : "var(--grey-soft)",
                            color: done ? "#fff" : "var(--text-3)",
                          }}
                        >
                          {done ? <Check size={14} strokeWidth={3} /> : <CircleDot size={13} />}
                        </span>
                        <span className="hidden text-[11px] sm:block" style={{ color: done ? "var(--text)" : "var(--text-3)" }}>
                          {s.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="mx-1 mb-5 h-[3px] flex-1 rounded-full sm:mb-6" style={{ background: currentStep > i ? "var(--accent)" : "var(--grey-soft)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* chat */}
          <div className="card overflow-hidden rise" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
              <MessageSquare size={16} style={{ color: "var(--accent)" }} />
              <span className="text-[15px] font-semibold">Conversa com o Gabriel</span>
              <span className="ml-auto text-[12px]" style={{ color: "var(--text-3)" }}>resposta em minutos</span>
            </div>

            <div className="flex max-h-[46vh] min-h-[180px] flex-col gap-3 overflow-y-auto px-6 py-5">
              {messages.length === 0 && (
                <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
                  Envie uma mensagem para combinar horário, endereço ou dúvida sobre o serviço.
                </p>
              )}
              {messages.map((m: any) => (
                <div key={m.id} className={m.author === "gbr" ? "self-end" : "self-start"} style={{ maxWidth: "84%" }}>
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
                    {m.author === "gbr" ? "GBR Soluções" : "Você"} · {fmtDateTime(m.createdAt)}
                  </p>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <input
                className="input flex-1"
                placeholder="Escreva sua mensagem…"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && msg.trim()) {
                    void post({ body: msg.trim() });
                    setMsg("");
                  }
                }}
                aria-label="Mensagem"
              />
              <button
                className="btn btn-primary"
                type="button"
                disabled={sending || !msg.trim()}
                onClick={async () => {
                  if (!msg.trim()) return;
                  await post({ body: msg.trim() });
                  setMsg("");
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* observações do prestador */}
          {order.observations && (
            <div className="card p-6 rise" style={{ animationDelay: "160ms" }}>
              <p className="label mb-2">Observações técnicas</p>
              <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>{order.observations}</p>
            </div>
          )}

          {/* assinatura */}
          <div className="card p-6 rise" style={{ animationDelay: "200ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="label">Aceite do serviço</p>
                <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-2)" }}>
                  {sig ? "Obrigado! Sua assinatura foi registrada." : "Confirme o aceite assinando abaixo."}
                </p>
              </div>
              {sig && <Badge tone="green"><Signature size={12} /> Assinado</Badge>}
            </div>
            <SignaturePad value={sig} onChange={(v) => setSig(v)} height={150} />
            <button
              className="btn btn-primary mt-3"
              type="button"
              disabled={!sig || sending}
              onClick={async () => {
                await post({ signature: sig, approved: true });
              }}
            >
              <Check size={16} /> Enviar aceite
            </button>
          </div>

          {/* contato */}
          <div className="card p-6 rise" style={{ animationDelay: "240ms" }}>
            <p className="label mb-3">Precisa falar comigo?</p>
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-primary" href={waLink("(11) 98842-3310", `Olá Gabriel, sou ${client?.name || ""} — sobre a OS ${order.number}.`)} target="_blank" rel="noreferrer">
                <Phone size={16} /> WhatsApp
              </a>
              <a className="btn" href="mailto:contato@gbrsolucoes.com.br">
                <Mail size={16} /> E-mail
              </a>
              <a className="btn" href="tel:+5511988423310">
                <Phone size={16} /> (11) 98842-3310
              </a>
            </div>
            <p className="mt-4 text-[12.5px]" style={{ color: "var(--text-3)" }}>
              Gabriel Bispo · GBR Soluções — seu sobrinho de aluguel · atendimento de segunda a sábado, 8h às 20h.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: "var(--inset)", border: "1px solid var(--line)" }}>
      <p className="label mb-1.5">{label}</p>
      <p className={strong ? "tnum text-[16px] font-semibold" : "text-[13.5px]"}>{value}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-30 h-14" style={{ borderBottom: "1px solid var(--line)" }} />
      <main className="px-4 pb-20 pt-6 sm:px-6">{children}</main>
      <footer className="pb-10 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
        GBR Soluções · portal seguro, sem cadastro
      </footer>
    </div>
  );
}
