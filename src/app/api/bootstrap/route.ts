import { NextResponse } from "next/server";
import { db } from "@/db";
import { TABLES, TABLE_SLUGS } from "@/lib/tables";
import { ensureSeed } from "@/lib/seed";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const data: Record<string, unknown[]> = {};
    await Promise.all(
      TABLE_SLUGS.map(async (slug) => {
        const { tbl } = TABLES[slug];
        const rows = await db
          .select()
          .from(tbl)
          .orderBy(asc((tbl as any).id ?? (tbl as any).key));
        data[slug] = rows as unknown[];
      }),
    );
    return NextResponse.json({ ok: true, data, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error("bootstrap failed", err);
    return NextResponse.json({ ok: false, error: "Falha ao carregar dados" }, { status: 500 });
  }
}
