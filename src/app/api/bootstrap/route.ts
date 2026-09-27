import { NextResponse } from "next/server";
import { friendlyDbError, getStore } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const store = getStore();
    const clientVersion = new URL(req.url).searchParams.get("v");
    const version = await store.version();

    // Nada mudou desde a última sincronização: responde sem reler o banco
    // (economiza leituras — no Firestore gratuito cada documento lido conta).
    if (version && clientVersion === version) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        source: store.kind,
        version,
        syncedAt: new Date().toISOString(),
      });
    }

    await ensureSeed(store);
    const data = await store.listAll();
    const freshVersion = (await store.version()) ?? version;

    return NextResponse.json({
      ok: true,
      source: store.kind,
      version: freshVersion,
      data,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("bootstrap failed", err);
    return NextResponse.json({ ok: false, error: friendlyDbError(err) }, { status: 500 });
  }
}
