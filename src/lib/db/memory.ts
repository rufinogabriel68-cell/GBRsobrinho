import {
  TABLE_INFO,
  TABLE_SLUGS,
  type MutationResult,
  type Persistence,
  type PortalPayload,
  type Row,
  type TableSlug,
} from "./types";

/**
 * Banco de demonstração: guarda tudo na memória do servidor.
 *
 * Serve para você abrir o painel e mexer em tudo **sem configurar nada** —
 * útil para conhecer o sistema e para testar. Os dados NÃO são salvos: ao
 * reiniciar o servidor (ou quando a Vercel troca a instância) tudo volta ao
 * estado inicial de exemplo.
 *
 * Para uso diário de verdade, configure o Firebase (veja docs/1-firebase.md).
 * O painel avisa sempre que estiver rodando neste modo.
 */

type DemoDb = {
  rows: Record<string, Row[]>;
  seq: Record<string, number>;
  version: number;
  seeded: boolean;
};

const globalForDemo = globalThis as typeof globalThis & { __gbrDemoDb?: DemoDb };

function db(): DemoDb {
  if (!globalForDemo.__gbrDemoDb) {
    const rows: Record<string, Row[]> = {};
    const seq: Record<string, number> = {};
    for (const table of TABLE_SLUGS) {
      rows[table] = [];
      seq[table] = 0;
    }
    globalForDemo.__gbrDemoDb = { rows, seq, version: 1, seeded: false };
  }
  return globalForDemo.__gbrDemoDb;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const numericId = (v: unknown) => (typeof v === "number" ? v : Number(v));

export function createMemoryStore(): Persistence {
  const touch = () => {
    db().version += 1;
    return String(db().version);
  };

  function insertOne(table: TableSlug, data: Row): Row {
    const store = db();
    const id = store.seq[table] + 1;
    store.seq[table] = id;

    const row: Row = { ...data, id };
    for (const key of TABLE_INFO[table].dateFields) {
      const value = row[key];
      if (value === undefined || value === null || value === "") row[key] = null;
      else row[key] = new Date(value as string | number | Date).toISOString();
    }
    store.rows[table].push(row);
    return clone(row);
  }

  return {
    kind: "demo",
    label: "Demonstração (memória)",

    async version() {
      return String(db().version);
    },

    async isSeeded() {
      return db().seeded;
    },

    async markSeeded() {
      db().seeded = true;
      touch();
    },

    async list(table) {
      return clone(db().rows[table] ?? []);
    },

    async listAll() {
      const out: Record<string, Row[]> = {};
      for (const table of TABLE_SLUGS) out[table] = clone(db().rows[table] ?? []);
      return out;
    },

    async insertMany(table, items) {
      const created = items.map((item) => insertOne(table, item));
      touch();
      return created;
    },

    async create(table, data): Promise<MutationResult> {
      if (table === "settings") {
        const key = String(data.key);
        const settings = db().rows.settings;
        const i = settings.findIndex((r) => r.key === key);
        const row = { key, value: data.value };
        if (i >= 0) settings[i] = row;
        else settings.push(row);
        touch();
        return { row: clone(row) };
      }

      const row = insertOne(table, data);
      touch();

      if (table === "stockMoves") {
        const item = db().rows.stock.find((r) => numericId(r.id) === numericId(row.stockId));
        if (item) {
          const delta = row.type === "in" ? Number(row.quantity) : -Number(row.quantity);
          item.quantity = Math.max(0, Number(item.quantity ?? 0) + delta);
          item.updatedAt = new Date().toISOString();
          touch();
          return { row, related: [{ table: "stock", rows: [clone(item)] }] };
        }
      }

      return { row };
    },

    async update(table, id, data): Promise<MutationResult | null> {
      const store = db();

      if (table === "settings") {
        const key = String(data.key ?? id);
        const rows = store.rows.settings;
        const i = rows.findIndex((r) => r.key === key);
        const row = { key, value: data.value };
        if (i >= 0) rows[i] = row;
        else rows.push(row);
        touch();
        return { row: clone(row) };
      }

      const rows = store.rows[table] ?? [];
      const i = rows.findIndex((r) => numericId(r.id) === numericId(id));
      if (i < 0) return null;

      const merged: Row = { ...rows[i], ...data, id: rows[i].id };
      for (const key of TABLE_INFO[table].dateFields) {
        const value = merged[key];
        if (value === undefined || value === null || value === "") merged[key] = null;
        else merged[key] = new Date(value as string | number | Date).toISOString();
      }
      rows[i] = merged;
      touch();
      return { row: clone(merged) };
    },

    async remove(table, id) {
      const store = db();
      if (table === "settings") {
        store.rows.settings = store.rows.settings.filter((r) => String(r.key) !== String(id));
        touch();
        return;
      }
      store.rows[table] = (store.rows[table] ?? []).filter((r) => numericId(r.id) !== numericId(id));
      touch();
    },

    async upsertSetting(key, value) {
      const result = await this.create("settings", { key, value });
      return result.row;
    },

    async findOrderByToken(token): Promise<PortalPayload | null> {
      const store = db();
      const order = store.rows.orders.find((o) => String(o.token) === String(token));
      if (!order) return null;
      const client = store.rows.clients.find((c) => numericId(c.id) === numericId(order.clientId));
      const messages = store.rows.orderMessages
        .filter((m) => numericId(m.orderId) === numericId(order.id))
        .sort((a, b) => +new Date(String(a.createdAt)) - +new Date(String(b.createdAt)));
      return {
        order: clone(order),
        client: client ? clone(client) : null,
        messages: clone(messages),
      };
    },

    async addOrderMessage(orderId, body) {
      insertOne("orderMessages", {
        orderId,
        author: "cliente",
        body: body.trim().slice(0, 1200),
        createdAt: new Date().toISOString(),
      });
      touch();
    },

    async updateOrder(orderId, patch) {
      const rows = db().rows.orders;
      const i = rows.findIndex((r) => numericId(r.id) === numericId(orderId));
      if (i < 0) return;
      rows[i] = { ...rows[i], ...patch };
      touch();
    },

    async ping() {
      void db().version;
    },
  };
}
