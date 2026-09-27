import { createFirestoreStore, firebaseConfigured } from "./firestore";
import { createPostgresStore } from "./postgres";
import type { Persistence, StoreKind } from "./types";

export * from "./types";

let cached: Persistence | null = null;

export function configuredKind(): StoreKind | null {
  const forced = process.env.DB_DRIVER?.toLowerCase();
  if (forced === "firestore" || forced === "postgres") return forced as StoreKind;
  if (firebaseConfigured()) return "firestore";
  if (process.env.DATABASE_URL) return "postgres";
  return null;
}

/** Escolhe o banco: Firestore quando há credenciais do Firebase, senão Postgres. */
export function getStore(): Persistence {
  if (cached) return cached;
  const kind = configuredKind();
  if (kind === "firestore") cached = createFirestoreStore();
  else if (kind === "postgres") cached = createPostgresStore();
  else {
    throw new Error(
      "Nenhum banco configurado. Defina FIREBASE_SERVICE_ACCOUNT (ou FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) para usar o Firestore, ou DATABASE_URL para usar Postgres.",
    );
  }
  return cached;
}

export function resetStoreCache() {
  cached = null;
}

/**
 * Traduz o erro do driver para algo que faça sentido na tela — o detalhe
 * técnico continua nos logs (Vercel → Deployments → Functions).
 */
export function friendlyDbError(err: unknown): string {
  // junta a cadeia de causas (o driver aninha o erro real em `cause`)
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const e = current as { message?: string; code?: string; cause?: unknown };
    if (e.message) parts.push(e.message);
    if (e.code) parts.push(String(e.code));
    current = e.cause;
  }
  const raw = parts.join(" | ") || String(err);
  const kind = configuredKind();

  if (/Nenhum banco configurado/.test(raw)) {
    return "Nenhum banco configurado. Preencha as variáveis do Firebase (FIREBASE_SERVICE_ACCOUNT) ou a DATABASE_URL na Vercel.";
  }

  if (kind === "firestore") {
    if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(raw)) {
      return "Não encontrei o projeto do Firebase. Confira FIREBASE_PROJECT_ID e a internet do servidor.";
    }
    if (/credential|invalid_grant|PERMISSION_DENIED|UNAUTHENTICATED|private key|DECODER/i.test(raw)) {
      return "Credencial do Firebase inválida. Recopie o JSON da conta de serviço em FIREBASE_SERVICE_ACCOUNT (com as quebras de linha do private_key).";
    }
    if (/NOT_FOUND|does not exist/i.test(raw)) {
      return "Firestore não encontrado neste projeto. Abra o console do Firebase e crie o banco em modo produção.";
    }
    return "Falha ao conversar com o Firestore. Veja os logs da Vercel para o detalhe técnico.";
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|getaddrinfo/i.test(raw)) {
    return "O Postgres não respondeu. Confira DATABASE_URL (host, porta e senha) — ou use o Firestore.";
  }
  if (/password|authentication|SASL|role .* does not exist/i.test(raw)) {
    return "Usuário ou senha do Postgres recusados. Confira DATABASE_URL — ou use o Firestore.";
  }
  if (/relation .* does not exist|does not exist/i.test(raw)) {
    return "Tabelas não encontradas no Postgres. Rode `npx drizzle-kit push` — ou use o Firestore.";
  }
  return raw.split("\n")[0].slice(0, 200);
}

