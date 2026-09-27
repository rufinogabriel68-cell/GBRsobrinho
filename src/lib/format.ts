const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um número como moeda brasileira: R$ 1.234,56 */
export function brl(value: number): string {
  return brlFormatter.format(value);
}

/** Formata número compacto para eixos de gráficos: 1,2 mil */
export function compactBRL(value: number): string {
  if (value >= 1000) {
    const v = value / 1000;
    return `R$ ${v.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return brl(value);
}

/** Formata uma data ISO (yyyy-mm-dd) sem problemas de fuso: 26 de set. de 2026 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Formata epoch ms como data: 26/09/2026 */
export function formatEpochDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString("pt-BR");
}

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getMonth()];
}

/** "sobre" um valor relativo ao anterior: "+12,4%" ou "-8,2%" */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

/** Máscara simples de telefone brasileiro enquanto digita */
export function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 5)
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9 dígitos: (11) 91234-5678
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

/** Data de hoje no formato yyyy-mm-dd (fuso local), para inputs type="date" */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Converte "59,90" ou "59.90" para number */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Formata número para campo editável em pt-BR: 59.9 → "59,90" */
export function toEditableDecimal(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
