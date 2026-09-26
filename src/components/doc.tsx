"use client";

import type { ReactNode } from "react";
import { brl, fmtDate, fmtDateTime } from "@/lib/format";

export const printNow = () => window.setTimeout(() => window.print(), 80);

const page: React.CSSProperties = {
  background: "#fff",
  color: "#111",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, Helvetica, Arial, sans-serif',
  padding: "34px 36px",
  fontSize: 13,
  lineHeight: 1.55,
  letterSpacing: "-0.01em",
};

const h1: React.CSSProperties = { fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 };
const muted: React.CSSProperties = { color: "#6b6b70" };
const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b6b70",
  borderBottom: "1px solid #dcdce1",
  padding: "8px 6px",
};
const td: React.CSSProperties = { padding: "9px 6px", borderBottom: "1px solid #eeeef1", verticalAlign: "top" };

function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="doc-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E9BFF" />
          <stop offset="55%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#0057D8" />
        </linearGradient>
      </defs>
      <path d="M32 1.5C48.9 1.5 62.5 15.1 62.5 32S48.9 62.5 32 62.5 1.5 48.9 1.5 32 15.1 1.5 32 1.5Z" fill="url(#doc-mark)" />
      <path d="M47 24A16 16 0 1 0 47 40L47 33.5 38 33.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="29" r="3.1" fill="#FF9F0A" />
    </svg>
  );
}

function DocFrame({ children, footer }: { children: ReactNode; footer?: string }) {
  return (
    <div className="print-area" style={page}>
      {children}
      {footer && (
        <p style={{ ...muted, fontSize: 10.5, marginTop: 30, borderTop: "1px solid #dcdce1", paddingTop: 12 }}>{footer}</p>
      )}
    </div>
  );
}

function Head({ doc, number, date, right, logo }: { doc: string; number: string; date: string; right?: ReactNode; logo?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {logo ? (
          <img src={logo} alt="Logo" style={{ height: 44, width: 44, objectFit: "contain", borderRadius: 10 }} />
        ) : (
          <Mark />
        )}
        <div>
          <p style={{ ...h1, fontSize: 20 }}>GBR Soluções</p>
          <p style={{ ...muted, fontSize: 11.5 }}>Seu sobrinho de aluguel · (11) 98842-3310 · contato@gbrsolucoes.com.br</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ ...muted, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>{doc}</p>
        <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{number}</p>
        <p style={{ ...muted, fontSize: 11.5 }}>{date}</p>
        {right}
      </div>
    </div>
  );
}

function Party({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ flex: 1 }}>
      <p style={{ ...th, borderBottom: "none", padding: "0 0 6px" }}>{title}</p>
      <div style={{ fontSize: 12.5 }}>
        {lines.filter(Boolean).map((l, i) => (
          <p key={i} style={{ margin: 0 }}>{l}</p>
        ))}
      </div>
    </div>
  );
}

function Signature({ value, label }: { value?: string | null; label: string }) {
  return (
    <div style={{ marginTop: 34, display: "flex", gap: 40 }}>
      <div style={{ flex: 1 }}>
        {value ? (
          <img src={value} alt="Assinatura" style={{ maxHeight: 64, display: "block", marginBottom: 4 }} />
        ) : (
          <div style={{ height: 64 }} />
        )}
        <div style={{ borderTop: "1px solid #9a9aa0", paddingTop: 6, fontSize: 11.5, color: "#6b6b70" }}>{label}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: 64 }} />
        <div style={{ borderTop: "1px solid #9a9aa0", paddingTop: 6, fontSize: 11.5, color: "#6b6b70" }}>
          Data da aceite · ___/___/______
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ docs */

export type QuoteDocProps = {
  quote: any;
  client?: any;
  company: any;
  conditions: string;
  footer: string;
};

export function QuoteDoc({ quote, client, company, conditions, footer }: QuoteDocProps) {
  const items: any[] = quote.items || [];
  const fee = Number(quote.feePercent || 0);
  return (
    <DocFrame footer={footer}>
      <Head doc="Orçamento" number={quote.number} date={fmtDate(quote.createdAt)} logo={company?.logo} />
      <div style={{ display: "flex", gap: 24, margin: "26px 0 6px" }}>
        <Party
          title="Cliente"
          lines={[client?.name, client?.address, client?.city, client?.phone, client?.email]}
        />
        <Party title="Prestador" lines={[company?.owner, company?.document, company?.address]} />
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, margin: "22px 0 10px", letterSpacing: "-0.02em" }}>
        {quote.title || "Serviços"}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "52%" }}>Descrição</th>
            <th style={{ ...th, textAlign: "center" }}>Qtd</th>
            <th style={{ ...th, textAlign: "right" }}>Unitário</th>
            <th style={{ ...th, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={td}>{it.name}</td>
              <td style={{ ...td, textAlign: "center" }}>{it.qty}</td>
              <td style={{ ...td, textAlign: "right" }}>{brl(it.unit)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 500 }}>{brl(Number(it.unit) * Number(it.qty))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, marginLeft: "auto", width: 280 }}>
        <Row2 label="Subtotal" value={brl(quote.subtotal)} />
        {Number(quote.discount) > 0 && <Row2 label="Desconto" value={`− ${brl(quote.discount)}`} />}
        {fee > 0 && <Row2 label={`Taxa de cartão ${fee}%`} value={brl(Number(quote.total) - Number(quote.subtotal) + Number(quote.discount))} />}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #111", marginTop: 8, paddingTop: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
          <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }}>{brl(quote.total)}</span>
        </div>
      </div>

      <div style={{ marginTop: 26, display: "flex", gap: 30 }}>
        <div style={{ flex: 1 }}>
          <p style={th}>Condições</p>
          <p style={{ fontSize: 12 }}>{quote.conditions || conditions}</p>
        </div>
        <div style={{ width: 150 }}>
          <p style={th}>Validade</p>
          <p style={{ fontSize: 12 }}>{quote.validity || 15} dias a partir da emissão</p>
        </div>
      </div>

      <Signature value={quote.signature} label={`${client?.name || "Cliente"} — aceite do orçamento`} />
    </DocFrame>
  );
}

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", color: "#4a4a50" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ReceiptDoc({ quote, client, company, footer, received }: { quote: any; client?: any; company: any; footer: string; received?: number }) {
  const value = received ?? Number(quote.total);
  return (
    <DocFrame footer={footer}>
      <Head doc="Recibo" number={`REC-${quote.number?.split("-").pop() || "000"}`} date={fmtDate(new Date())} logo={company?.logo} />
      <div style={{ margin: "34px 0" }}>
        <p style={{ ...muted, fontSize: 12.5 }}>Recebemos de</p>
        <p style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{client?.name || "Cliente"}</p>
        <p style={{ ...muted, fontSize: 12.5, marginTop: 6 }}>a quantia de</p>
        <p style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.035em", margin: "6px 0" }}>{brl(value)}</p>
        <p style={{ fontSize: 13 }}>
          Correspondente a <strong>{quote.title}</strong> — orçamento {quote.number}.
        </p>
        <p style={{ ...muted, fontSize: 12.5, marginTop: 4 }}>Por extenso referente ao valor acima, referente a serviços prestados.</p>
      </div>
      <Signature value={quote.signature} label={`${company?.owner || "GBR Soluções"} — responsável`} />
    </DocFrame>
  );
}

export function ReportDoc({ month, rows, totals, company, footer }: { month: string; rows: any[]; totals: { in: number; out: number; goal: number }; company: any; footer: string }) {
  return (
    <DocFrame footer={footer}>
      <Head doc="Relatório mensal" number={month} date={fmtDate(new Date())} logo={company?.logo} />
      <div style={{ display: "flex", gap: 24, margin: "24px 0" }}>
        <Party title="Empresa" lines={[company?.name, company?.document, company?.address]} />
        <Party title="Responsável" lines={[company?.owner, company?.phone, company?.email]} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Kpi label="Entradas" value={brl(totals.in)} />
        <Kpi label="Saídas" value={brl(totals.out)} />
        <Kpi label="Resultado" value={brl(totals.in - totals.out)} />
        <Kpi label="Meta" value={`${Math.round((totals.in / Math.max(1, totals.goal)) * 100)}%`} />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Data</th>
            <th style={th}>Descrição</th>
            <th style={th}>Categoria</th>
            <th style={{ ...th, textAlign: "right" }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(r.entryDate)}</td>
              <td style={td}>{r.description}</td>
              <td style={{ ...td, color: "#6b6b70" }}>{r.category}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 500, color: r.kind === "in" ? "#1d8a3e" : "#d70015" }}>
                {r.kind === "in" ? "" : "− "}
                {brl(r.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Signature value={null} label={`${company?.owner} — responsável pela empresa`} />
    </DocFrame>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "#f4f4f7", borderRadius: 10, padding: "10px 12px" }}>
      <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b6b70" }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

export function LaudoDoc({ data, company, footer }: { data: any; company: any; footer: string }) {
  return (
    <DocFrame footer={footer}>
      <Head doc="Laudo técnico" number={data.number} date={fmtDate(data.date)} logo={company?.logo} />
      <div style={{ display: "flex", gap: 24, margin: "24px 0" }}>
        <Party title="Cliente" lines={[data.client, data.address, data.phone]} />
        <Party title="Responsável técnico" lines={[company?.owner, company?.document, company?.phone]} />
      </div>
      <Section title="1. Objeto">
        {data.objective}
      </Section>
      <Section title="2. Metodologia">{data.methodology}</Section>
      <Section title="3. Constatações">{data.findings}</Section>
      <Section title="4. Parecer técnico">{data.opinion}</Section>
      <Section title="5. Recomendações">{data.recommendations}</Section>
      <Signature value={data.signature} label={`${company?.owner} — responsável técnico`} />
    </DocFrame>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12.5, color: "#33333a", whiteSpace: "pre-wrap" }}>{children || "—"}</p>
    </div>
  );
}

export { fmtDateTime };
