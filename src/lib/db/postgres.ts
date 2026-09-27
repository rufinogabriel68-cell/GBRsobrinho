import { asc, eq, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import {
  TABLE_INFO,
  TABLE_SLUGS,
  type MutationResult,
  type Persistence,
  type PortalPayload,
  type Row,
  type TableSlug,
} from "./types";

const TABLES: Record<TableSlug, any> = {
  categories: s.categories,
  services: s.services,
  clients: s.clients,
  quotes: s.quotes,
  orders: s.orders,
  orderMessages: s.orderMessages,
  stock: s.stock,
  stockMoves: s.stockMoves,
  events: s.events,
  finance: s.finance,
  notes: s.notes,
  settings: s.settings,
};

/** Converte campos de data (string ISO) para Date antes de gravar. */
export function coerce(table: TableSlug, data: Row): Row {
  const out: Row = { ...data };
  for (const key of TABLE_INFO[table].dateFields) {
    const value = out[key];
    if (value === undefined) continue;
    if (value === null || value === "") {
      out[key] = null;
      continue;
    }
    if (typeof value === "string") {
      const parsed = new Date(value);
      out[key] = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  // nunca deixe o cliente alterar a chave primária
  delete out.id;
  return out;
}

const sortKey = (table: TableSlug) => (table === "settings" ? s.settings.key : (TABLES[table] as any).id);

export function createPostgresStore(): Persistence {
  const db = () => getDb();

  const listOne = async (table: TableSlug): Promise<Row[]> => {
    const rows = await db()
      .select()
      .from(TABLES[table])
      .orderBy(asc(sortKey(table)));
    return rows as Row[];
  };

  const insertRows = async (table: TableSlug, rows: Row[]): Promise<Row[]> => {
    if (!rows.length) return [];
    const payload = rows.map((r) => coerce(table, r));
    const inserted = await db().insert(TABLES[table]).values(payload as never).returning();
    return inserted as Row[];
  };

  return {
    kind: "postgres",
    label: `Postgres · ${process.env.DATABASE_URL?.split("@").pop()?.split("/")[0] ?? "conectado"}`,

    // Postgres não precisa de versão: a leitura é barata e o app é single-user.
    async version() {
      return null;
    },

    async isSeeded() {
      const rows = await db().select({ id: s.services.id }).from(s.services).limit(1);
      return rows.length > 0;
    },

    async markSeeded() {
      /* no Postgres a própria tabela de serviços já indica que a base foi semeada */
    },

    list: listOne,

    async listAll() {
      const data: Record<string, Row[]> = {};
      await Promise.all(
        TABLE_SLUGS.map(async (slug) => {
          data[slug] = await listOne(slug);
        }),
      );
      return data;
    },

    insertMany: insertRows,

    async create(table, data) {
      if (table === "settings") {
        const key = String(data.key);
        const rows = await db()
          .insert(s.settings)
          .values({ key, value: data.value as never })
          .onConflictDoUpdate({ target: s.settings.key, set: { value: data.value as never } })
          .returning();
        return { row: rows[0] as Row };
      }

      const [row] = (await insertRows(table, [data])) as Row[];
      // movimentação de estoque atualiza a quantidade do item
      if (table === "stockMoves" && row) {
        const delta = row.type === "in" ? Number(row.quantity) : -Number(row.quantity);
        const [item] = await db().select().from(s.stock).where(eq(s.stock.id, row.stockId));
        if (item) {
          const [updated] = await db()
            .update(s.stock)
            .set({ quantity: Math.max(0, Number(item.quantity) + delta), updatedAt: new Date() })
            .where(eq(s.stock.id, row.stockId))
            .returning();
          return { row, related: [{ table: "stock", rows: [updated as Row] }] };
        }
      }
      return { row };
    },

    async update(table, id, data) {
      if (table === "settings") {
        const key = String((data as Row).key ?? id);
        const rows = await db()
          .update(s.settings)
          .set({ value: (data as Row).value as never })
          .where(eq(s.settings.key, key))
          .returning();
        return rows[0] ? { row: rows[0] as Row } : null;
      }
      const rows = await db()
        .update(TABLES[table])
        .set(coerce(table, data) as never)
        .where(eq((TABLES[table] as any).id, id))
        .returning();
      return rows[0] ? { row: rows[0] as Row } : null;
    },

    async remove(table, id) {
      if (table === "settings") {
        await db().delete(s.settings).where(eq(s.settings.key, String(id)));
        return;
      }
      await db().delete(TABLES[table]).where(eq((TABLES[table] as any).id, id));
    },

    async upsertSetting(key, value) {
      const rows = await db()
        .insert(s.settings)
        .values({ key, value: value as never })
        .onConflictDoUpdate({ target: s.settings.key, set: { value: value as never } })
        .returning();
      return rows[0] as Row;
    },

    async findOrderByToken(token): Promise<PortalPayload | null> {
      const [order] = await db().select().from(s.orders).where(eq(s.orders.token, token));
      if (!order) return null;
      const [client] = order.clientId
        ? await db().select().from(s.clients).where(eq(s.clients.id, order.clientId))
        : [null];
      const messages = await db()
        .select()
        .from(s.orderMessages)
        .where(eq(s.orderMessages.orderId, order.id))
        .orderBy(asc(s.orderMessages.createdAt));
      return { order: order as Row, client: (client as Row) ?? null, messages: messages as Row[] };
    },

    async addOrderMessage(orderId, body) {
      await db().insert(s.orderMessages).values({
        orderId,
        author: "cliente",
        body: body.trim().slice(0, 1200),
      });
    },

    async updateOrder(orderId, patch) {
      await db().update(s.orders).set(coerce("orders", patch) as never).where(eq(s.orders.id, orderId));
    },

    async ping() {
      await db().execute(sql`select 1`);
    },
  };
}
