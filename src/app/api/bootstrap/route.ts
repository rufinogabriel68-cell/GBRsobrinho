import { NextResponse } from "next/server";
import { friendlyDbError, getStore } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const store = getStore();
    await ensureSeed(store);
    const data = await store.listAll();
    return NextResponse.json({
      ok: true,
      source: store.kind,
      data,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("bootstrap failed", err);
    return NextResponse.json({ ok: false, error: friendlyDbError(err) }, { status: 500 });
  }
}
