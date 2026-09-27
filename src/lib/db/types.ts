/** Contrato único de persistência — implementado por Postgres (Drizzle) e Firestore. */

export type Row = Record<string, any>;

export const TABLE_INFO = {
  categories: { label: "Categorias", dateFields: [] as string[] },
  services: { label: "Serviços", dateFields: [] as string[] },
  clients: { label: "Clientes", dateFields: ["createdAt"] },
  quotes: { label: "Orçamentos", dateFields: ["createdAt"] },
  orders: { label: "Ordens de Serviço", dateFields: ["scheduledAt", "createdAt"] },
  orderMessages: { label: "Mensagens", dateFields: ["createdAt"] },
  stock: { label: "Estoque", dateFields: ["updatedAt"] },
  stockMoves: { label: "Movimentações", dateFields: ["createdAt"] },
  events: { label: "Agenda", dateFields: ["startAt", "endAt"] },
  finance: { label: "Financeiro", dateFields: ["entryDate"] },
  notes: { label: "Anotações", dateFields: ["updatedAt"] },
  settings: { label: "Configurações", dateFields: [] },
} as const;

export type TableSlug = keyof typeof TABLE_INFO;
export const TABLE_SLUGS = Object.keys(TABLE_INFO) as TableSlug[];

export type PortalPayload = {
  order: Row;
  client: Row | null;
  messages: Row[];
};

export type StoreKind = "postgres" | "firestore" | "demo";

/** Resultado de uma gravação: a linha principal + tabelas afetadas por efeito colateral. */
export type MutationResult = {
  row: Row;
  related?: { table: TableSlug; rows: Row[] }[];
};

export interface Persistence {
  readonly kind: StoreKind;
  /** Nome amigável para a tela de Ajustes (ex.: "Firestore · gbr-solucoes"). */
  readonly label: string;

  /**
   * Impressão digital do banco (muda a cada gravação). Permite que o app
   * pergunte "mudou algo?" gastando 1 leitura em vez de baixar tudo de novo —
   * essencial no plano gratuito do Firestore. `null` = sempre envia tudo.
   */
  version(): Promise<string | null>;
  isSeeded(): Promise<boolean>;
  markSeeded(): Promise<void>;

  list(table: TableSlug): Promise<Row[]>;
  /** Todas as tabelas de uma vez (bootstrap). */
  listAll(): Promise<Record<string, Row[]>>;
  insertMany(table: TableSlug, rows: Row[]): Promise<Row[]>;
  create(table: TableSlug, data: Row): Promise<MutationResult>;
  update(table: TableSlug, id: number, data: Row): Promise<MutationResult | null>;
  remove(table: TableSlug, id: number): Promise<void>;
  upsertSetting(key: string, value: unknown): Promise<Row>;

  /* portal do cliente */
  findOrderByToken(token: string): Promise<PortalPayload | null>;
  addOrderMessage(orderId: number, body: string): Promise<void>;
  updateOrder(orderId: number, patch: Row): Promise<void>;

  ping(): Promise<void>;
}

/** Converte string ISO em Date (Firestore) ou mantém o formato esperado pelo driver. */
export const isDateKey = (table: TableSlug, key: string) =>
  (TABLE_INFO[table].dateFields as readonly string[]).includes(key);
