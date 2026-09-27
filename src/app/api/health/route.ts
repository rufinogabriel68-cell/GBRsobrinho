import { NextResponse } from "next/server";
import { configuredKind, friendlyDbError, getStore } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Diagnóstico rápido do deploy: abre no navegador depois de publicar na Vercel.
 * `/api/health` responde `{ ok: true, database: "firestore" }` quando tudo está ligado.
 */
export async function GET() {
  const kind = configuredKind();
  const auth = !!process.env.APP_PASSWORD;
  if (!kind) {
    return NextResponse.json(
      {
        ok: false,
        database: null,
        auth,
        error:
          "Nenhum banco configurado. Preencha as variáveis do Firebase (FIREBASE_SERVICE_ACCOUNT ou FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) ou DATABASE_URL.",
      },
      { status: 500 },
    );
  }

  try {
    const store = getStore();
    await store.ping();
    return NextResponse.json({ ok: true, database: store.kind, label: store.label, auth });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        database: kind,
        auth,
        error: friendlyDbError(err),
      },
      { status: 500 },
    );
  }
}
