import { createFirestoreStore, firebaseConfigured } from "./firestore";
import { createMemoryStore } from "./memory";
import { createPostgresStore } from "./postgres";
import type { Persistence, StoreKind } from "./types";

export * from "./types";

let cached: Persistence | null = null;

export function configuredKind(): StoreKind | null {
  const forced = process.env.DB_DRIVER?.toLowerCase();
  if (forced === "firestore" || forced === "postgres" || forced === "demo" || forced === "memory") {
    return (forced === "memory" ? "demo" : forced) as StoreKind;
  }
  if (firebaseConfigured()) return "firestore";
  if (process.env.DATABASE_URL) return "postgres";
  // Nada configurado: o app abre em modo demonstração (dados só na memória),
  // para você conhecer o painel antes de criar a conta no Firebase.
  return null;
}

/** Escolhe o banco: Firestore quando há credenciais do Firebase, senão Postgres. */
export function getStore(): Persistence {
  if (cached) return cached;
  const kind = configuredKind();
  if (kind === "firestore") cached = createFirestoreStore();
  else if (kind === "postgres") cached = createPostgresStore();
  else cached = createMemoryStore();
  return cached;
}

export function resetStoreCache() {
  cached = null;
}

/** Onde o app está gravando, sem revelar segredos (aparece em /api/health). */
export function databaseLabel(): string {
  const kind = configuredKind();
  if (kind === "firestore") return "Firestore (Firebase)";
  if (kind === "postgres") return "Postgres";
  return "demonstração (memória)";
}

/**
 * Traduz o erro do driver para algo que faça sentido na tela — o detalhe
 * técnico continua nos logs (Vercel → Deployments → Functions).
 */
export function friendlyDbError(err: unknown): string {
  // junta a cadeia de causas (o driver aninha o erro real em `cause`)
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const e = current as { message?: string; code?: string; cause?: unknown; detail?: string };
    if (e.message) parts.push(e.message);
    if (e.code) parts.push(String(e.code));
    if (e.detail) parts.push(String(e.detail));
    current = e.cause;
  }
  const raw = parts.join(" | ") || String(err);
  const kind = configuredKind();

  if (kind === "firestore") {
    if (/credential|invalid_grant|UNAUTHENTICATED|PERMISSION_DENIED|private key|DECODER/i.test(raw)) {
      return "Não consegui entrar no Firestore: a credencial foi recusada. Gere outra chave no console do Firebase (Contas de serviço → Gerar nova chave) e cole o JSON completo em FIREBASE_SERVICE_ACCOUNT.";
    }
    if (/ENOTFOUND|getaddrinfo|EAI_AGAIN|ETIMEDOUT|network/i.test(raw)) {
      return "Não consegui falar com o Firestore (sem rede ou projeto errado). Confira FIREBASE_PROJECT_ID e a sua internet.";
    }
    if (/NOT_FOUND|does not exist/i.test(raw)) {
      return "O banco Firestore ainda não foi criado nesse projeto. Abra o console do Firebase → Firestore Database → Criar banco de dados (modo produção).";
    }
    return "Falha ao conversar com o Firestore. Veja os logs do deploy para o detalhe técnico.";
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|getaddrinfo/i.test(raw)) {
    return "O banco não respondeu: não consegui conectar. Confira a DATABASE_URL (host, porta e senha) — ou configure o Firebase (veja docs/1-firebase.md).";
  }
  if (/password|authentication|SASL|role .* does not exist/i.test(raw)) {
    return "Usuário ou senha do Postgres recusados. Confira a DATABASE_URL — ou use o Firebase.";
  }
  if (/relation .* does not exist|does not exist/i.test(raw)) {
    return "As tabelas não existem nesse banco. Rode `npx drizzle-kit push` — ou use o Firebase, que não precisa disso.";
  }
  return raw.split("\n")[0].slice(0, 240);
}

