import { NextResponse } from "next/server";
import { friendlyDbError, getStore, TABLE_SLUGS, type TableSlug } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  if (!body?.table || !TABLE_SLUGS.includes(body.table)) {
    return NextResponse.json({ ok: false, error: "Tabela desconhecida" }, { status: 400 });
  }

  try {
    const store = getStore();

    if (body.op === "create") {
      const row = await store.create(body.table, body.data ?? {});
      return NextResponse.json({ ok: true, row });
    }

    if (body.op === "update") {
      if (body.id == null) {
        return NextResponse.json({ ok: false, error: "ID obrigatório para atualizar" }, { status: 400 });
      }
      const row = await store.update(body.table, Number(body.id), body.data ?? {});
      if (!row) return NextResponse.json({ ok: false, error: "Registro não encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true, row });
    }

    if (body.op === "delete") {
      if (body.id == null) {
        return NextResponse.json({ ok: false, error: "ID obrigatório para excluir" }, { status: 400 });
      }
      await store.remove(body.table, Number(body.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Operação inválida" }, { status: 400 });
  } catch (err) {
    console.error("data mutation failed", err);
    return NextResponse.json({ ok: false, error: friendlyDbError(err) }, { status: 500 });
  }
}
