export const brl = (v: number | undefined | null) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v: number | undefined | null, d = 0) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtDate = (v?: string | Date | null, opts?: Intl.DateTimeFormatOptions) =>
  v
    ? new Date(v).toLocaleDateString("pt-BR", opts ?? { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const fmtDateTime = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtTime = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

export const daysUntil = (v?: string | Date | null) =>
  v ? Math.ceil((new Date(v).getTime() - Date.now()) / 86400000) : 0;

export const uid = () => Math.random().toString(36).slice(2, 10);

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const isoDay = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const monthKey = (d: Date | string) => isoDay(d).slice(0, 7);

export const QUOTE_STATUS: Record<string, { label: string; tone: string }> = {
  aguardando: { label: "Aguardando", tone: "amber" },
  aprovado: { label: "Aprovado", tone: "green" },
  faturado: { label: "Faturado", tone: "blue" },
  recusado: { label: "Recusado", tone: "red" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: string; step: number }> = {
  aberta: { label: "Aberta", tone: "grey", step: 0 },
  aprovada: { label: "Aprovada pelo cliente", tone: "green", step: 1 },
  agendada: { label: "Agendada", tone: "blue", step: 1 },
  em_andamento: { label: "Em andamento", tone: "amber", step: 2 },
  aguardando_cliente: { label: "Aguardando cliente", tone: "purple", step: 3 },
  concluida: { label: "Concluída", tone: "green", step: 4 },
  cancelada: { label: "Cancelada", tone: "red", step: -1 },
};

/** Ordens que ainda exigem trabalho (usado no painel e no menu do portal). */
export const OPEN_ORDER_STATUS = ["aberta", "aprovada", "agendada", "em_andamento", "aguardando_cliente"];

export const waLink = (phone: string | undefined | null, message: string) => {
  const p = onlyDigits(phone || "");
  const full = p.length <= 11 ? `55${p}` : p;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
};

export const mailLink = (email: string | undefined | null, subject: string, body: string) =>
  `mailto:${email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** Link absoluto do portal do cliente (usa NEXT_PUBLIC_SITE_URL quando existir). */
export const portalLink = (token: string) => {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/portal/${token}`;
};
