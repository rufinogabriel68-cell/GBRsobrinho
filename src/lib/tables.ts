import * as schema from "@/db/schema";

/** Server-side registry: table slug -> drizzle table + UI label. */
export const TABLES = {
  categories: { tbl: schema.categories, label: "Categorias" },
  services: { tbl: schema.services, label: "Serviços" },
  clients: { tbl: schema.clients, label: "Clientes" },
  quotes: { tbl: schema.quotes, label: "Orçamentos" },
  orders: { tbl: schema.orders, label: "Ordens de Serviço" },
  orderMessages: { tbl: schema.orderMessages, label: "Mensagens" },
  stock: { tbl: schema.stock, label: "Estoque" },
  stockMoves: { tbl: schema.stockMoves, label: "Movimentações" },
  events: { tbl: schema.events, label: "Agenda" },
  finance: { tbl: schema.finance, label: "Financeiro" },
  notes: { tbl: schema.notes, label: "Anotações" },
  settings: { tbl: schema.settings, label: "Configurações" },
} as const;

export type TableSlug = keyof typeof TABLES;
export const TABLE_SLUGS = Object.keys(TABLES) as TableSlug[];
