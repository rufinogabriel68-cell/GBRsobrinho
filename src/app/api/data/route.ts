import { NextResponse } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { TABLES, type TableSlug } from "@/lib/tables";
import { eq, getTableColumns, type Table } from "drizzle-orm";

/** Converte strings de data em Date para colunas timestamp/date. */
function coerce(tbl: Table, data: Record<string, unknown>) {
  const cols = getTableColumns(tbl) as Record<string, { dataType?: string; columnType?: string }>;
  const out: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value !== "string") continue;
    const col = cols[key];
    const isDateCol =
      !!col &&
      (col.dataType === "timestamp" ||
        col.dataType === "date" ||
        /Timestamp|Date/.test(String(col.columnType || "")));
    const looksLikeDateField = /(At|Date|_at)$/.test(key);
    if (!isDateCol && !looksLikeDateField) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) out[key] = parsed;
  }
  return out;
}

export const dynamic = "force-dynamic";

type Body = {
  table: TableSlug;
  op: "create" | "update" | "delete";
  id?: number;
  data?: Record<string, unknown>;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const entry = TABLES[body.table];
  if (!entry) {
    return NextResponse.json({ ok: false, error: "Tabela desconhecida" }, { status: 400 });
  }

  try {
    if (body.op === "create") {
      const payload = coerce(entry.tbl as Table, (body.data ?? {}) as Record<string, unknown>);
      if (body.table === "settings") {
        const rows = await db
          .insert(s.settings)
          .values({ key: String(payload.key), value: payload.value as never })
          .onConflictDoUpdate({ target: s.settings.key, set: { value: payload.value as never } })
          .returning();
        return NextResponse.json({ ok: true, row: rows[0] });
      }
      const rows = await db
        .insert(entry.tbl as never)
        .values(payload as never)
        .returning();
      const row = rows[0] as any;
      // movimentação de estoque atualiza a quantidade do item
      if (body.table === "stockMoves" && row) {
        const delta = row.type === "in" ? Number(row.quantity) : -Number(row.quantity);
        const [item] = await db
          .select()
          .from(s.stock)
          .where(eq(s.stock.id, row.stockId));
        if (item) {
          await db
            .update(s.stock)
            .set({ quantity: Math.max(0, Number(item.quantity) + delta), updatedAt: new Date() })
            .where(eq(s.stock.id, row.stockId));
        }
      }
      return NextResponse.json({ ok: true, row });
    }

    if (body.op === "update" && body.id != null) {
      if (body.table === "settings") {
        const payload = (body.data ?? {}) as { key?: string; value?: unknown };
        const rows = await db
          .update(s.settings)
          .set({ value: payload.value as never })
          .where(eq(s.settings.key, String(payload.key)))
          .returning();
        return NextResponse.json({ ok: true, row: rows[0] });
      }
      const rows = await db
        .update(entry.tbl as never)
        .set(coerce(entry.tbl as Table, (body.data ?? {}) as Record<string, unknown>) as never)
        .where(eq((entry.tbl as any).id, body.id))
        .returning();
      return NextResponse.json({ ok: true, row: rows[0] });
    }

    if (body.op === "delete" && body.id != null) {
      await db.delete(entry.tbl as never).where(eq((entry.tbl as any).id, body.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Operação inválida" }, { status: 400 });
  } catch (err) {
    console.error("data mutation failed", err);
    return NextResponse.json({ ok: false, error: "Falha na gravação" }, { status: 500 });
  }
}
