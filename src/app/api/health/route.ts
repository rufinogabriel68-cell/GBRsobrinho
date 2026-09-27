import { NextResponse } from "next/server";
import { configuredKind, friendlyDbError, getStore } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Diagnóstico rápido do deploy: abre no navegador depois de publicar na Vercel.
 * `/api/health` responde `{ ok: true, database: "firestore" }` quando tudo está ligado.
 */
export async function GET() {
  const auth = !!process.env.APP_PASSWORD;
  try {
    const store = getStore();
    await store.ping();
    const demo = store.kind === "demo";
    return NextResponse.json({
      ok: true,
      database: store.kind,
      label: store.label,
      auth,
      demo,
      hint: demo
        ? "Modo demonstração: os dados ficam só na memória do servidor. Configure o Firebase (FIREBASE_SERVICE_ACCOUNT) para salvar de verdade — veja docs/1-firebase.md."
        : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        database: configuredKind(),
        auth,
        error: friendlyDbError(err),
      },
      { status: 500 },
    );
  }
}
