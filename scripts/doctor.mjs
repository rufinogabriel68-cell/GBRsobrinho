/**
 * GBR Soluções — "doutor" do ambiente.
 *
 *   npm run doctor
 *
 * Confere, antes de você publicar (ou quando algo der errado):
 *   1. Node na versão certa;
 *   2. qual banco o app vai usar (Firestore ou Postgres);
 *   3. se a credencial do Firebase/Postgres realmente funciona (tentativa real);
 *   4. se o painel está protegido com senha.
 *
 * Ele NUNCA imprime chaves — só o essencial (e-mail da conta, projeto, host).
 * Carrega variáveis de `.env.local` e `.env` automaticamente.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/* ------------------------------------------------------------------ ambiente */

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

const ok = (msg) => console.log(`  \u001b[32m✓\u001b[0m ${msg}`);
const bad = (msg) => console.log(`  \u001b[31m✗\u001b[0m ${msg}`);
const info = (msg) => console.log(`  \u001b[90m·\u001b[0m ${msg}`);
const title = (msg) => console.log(`\n\u001b[1m${msg}\u001b[0m`);

let problems = 0;
const problem = (msg, hint) => {
  problems += 1;
  bad(msg);
  if (hint) console.log(`      \u001b[33m→ ${hint}\u001b[0m`);
};

/* --------------------------------------------------------------------- 1. Node */

title("Ambiente");
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) ok(`Node ${process.versions.node}`);
else problem(`Node ${process.versions.node} é antigo`, "instale o Node 22 (nvm install 22)");

/* ------------------------------------------------------------- 2. qual banco */

title("Banco de dados");
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const splitCreds = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const databaseUrl = process.env.DATABASE_URL;
const forced = (process.env.DB_DRIVER || "").toLowerCase();

let kind = null;
if (forced === "firestore" || forced === "postgres") kind = forced;
else if (serviceAccountRaw || splitCreds || emulator || process.env.GOOGLE_APPLICATION_CREDENTIALS) kind = "firestore";
else if (databaseUrl) kind = "postgres";

if (!kind) {
  problem(
    "nenhum banco configurado",
    "defina FIREBASE_SERVICE_ACCOUNT (Firebase) ou DATABASE_URL (Postgres) em .env.local",
  );
}

if (kind === "firestore") {
  ok("Firestore (recomendado)");
  if (emulator) info(`usando o emulador local em ${emulator}`);
  if (databaseUrl) info("DATABASE_URL também existe — o Firestore tem prioridade");
}

if (kind === "postgres") {
  if (!databaseUrl) {
    problem("Postgres escolhido (DB_DRIVER) mas DATABASE_URL está vazia", "preencha DATABASE_URL em .env.local");
  } else {
    try {
      const url = new URL(databaseUrl);
      ok(`Postgres em ${url.host}${url.pathname}`);
      if (!/sslmode=/.test(databaseUrl)) info("dica: em bancos na nuvem costuma ser preciso ?sslmode=require");
    } catch {
      problem("DATABASE_URL não é uma URL válida", "formato: postgresql://usuario:senha@host:5432/banco");
    }
  }
}

/* --------------------------------------------------------- 3. credencial real */

async function checkFirestore() {
  title("Conexão com o Firebase");
  let account = null;
  if (serviceAccountRaw) {
    try {
      account = JSON.parse(
        serviceAccountRaw.trim().startsWith("{") ? serviceAccountRaw : Buffer.from(serviceAccountRaw, "base64").toString("utf8"),
      );
      ok("FIREBASE_SERVICE_ACCOUNT lido (JSON válido)");
    } catch {
      problem(
        "FIREBASE_SERVICE_ACCOUNT não é um JSON válido",
        "copie o arquivo inteiro da conta de serviço (Configurações do projeto → Contas de serviço → Gerar nova chave)",
      );
      return;
    }
  } else if (splitCreds) {
    account = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
    ok("FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY lidos");
  } else if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    problem("nenhuma credencial do Firebase encontrada", "veja docs/1-firebase.md (passo 5)");
    return;
  }

  if (account?.project_id) info(`projeto: ${account.project_id}`);
  if (account?.client_email) info(`conta: ${account.client_email}`);
  if (account?.private_key && !account.private_key.includes("BEGIN PRIVATE KEY")) {
    problem(
      "a chave privada não parece um PEM",
      "em FIREBASE_PRIVATE_KEY mantenha os \\n no lugar das quebras de linha",
    );
    return;
  }

  try {
    const { initializeApp, cert, applicationDefault, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    const app =
      getApps()[0] ||
      (account?.client_email && account?.private_key
        ? initializeApp({ credential: cert(account), projectId: account.project_id })
        : initializeApp({ credential: applicationDefault(), projectId: account?.project_id }));

    const db = getFirestore(app);
    const ref = db.collection("_meta").doc("health");
    await ref.set({ at: new Date().toISOString(), from: "npm run doctor" });
    const snap = await ref.get();
    ok(`Firestore respondeu (documento _meta/health em ${snap.data()?.at})`);
    ok("gravação e leitura funcionando — nada a fazer aqui");
  } catch (err) {
    const message = String(err?.message || err);
    if (/ENOTFOUND|getaddrinfo|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|network/i.test(message)) {
      problem(`sem conexão com o Firestore (${message.split("\n")[0]})`, "confira a internet/proxy desta máquina");
    } else if (/DECODER|private key|invalid_grant|credential|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
      problem(
        "credencial recusada pelo Google",
        "gere outra chave no console (Contas de serviço → Gerar nova chave) e cole o JSON inteiro",
      );
    } else if (/NOT_FOUND|does not exist|5 NOT_FOUND/i.test(message)) {
      problem(
        "o banco Firestore ainda não foi criado nesse projeto",
        "console do Firebase → Firestore Database → Criar banco de dados (modo produção)",
      );
    } else {
      problem(message.split("\n")[0].slice(0, 200), "veja docs/1-firebase.md");
    }
  }
}

async function checkPostgres() {
  title("Conexão com o Postgres");
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: /sslmode=require/.test(process.env.DATABASE_URL || "") ? { rejectUnauthorized: false } : undefined });
    await client.connect();
    const { rows } = await client.query("select count(*)::int as n from information_schema.tables where table_schema = 'public'");
    ok("Postgres conectado");
    if (rows[0].n === 0) {
      problem("nenhuma tabela encontrada", "rode: npm run db:push");
    } else {
      ok(`${rows[0].n} tabela(s) no schema public`);
    }
    await client.end();
  } catch (err) {
    const message = String(err?.message || err);
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout/i.test(message)) {
      problem(`não consegui falar com o servidor (${message.split("\n")[0]})`, "confira host/porta na DATABASE_URL");
    } else if (/password|authentication|SASL|role/i.test(message)) {
      problem("usuário ou senha recusados", "confira a senha na DATABASE_URL");
    } else {
      problem(message.split("\n")[0].slice(0, 200), "rode: npm run db:push");
    }
  }
}

/* ------------------------------------------------------------------- 4. senha */

title("Acesso ao painel");
if (process.env.APP_PASSWORD) {
  const pass = process.env.APP_PASSWORD;
  ok("painel protegido por senha (APP_PASSWORD definida)");
  if (pass.length < 8) info("dica: use uma senha com 8+ caracteres");
} else {
  problem(
    "sem APP_PASSWORD o painel fica aberto para quem tiver o endereço",
    "defina APP_PASSWORD em .env.local e na Vercel antes de publicar",
  );
}

if (process.env.NEXT_PUBLIC_SITE_URL) ok(`endereço configurado: ${process.env.NEXT_PUBLIC_SITE_URL}`);
else info("NEXT_PUBLIC_SITE_URL vazio — os links do portal usarão o domínio atual (funciona)");

/* ------------------------------------------------------------------- resumo */

if (kind === "firestore") await checkFirestore();
if (kind === "postgres" && databaseUrl) await checkPostgres();

title("Resumo");
if (problems === 0) {
  console.log("  \u001b[32mTudo certo! Rode `npm run dev` e abra http://localhost:3000\u001b[0m\n");
} else {
  console.log(`  \u001b[31m${problems} ponto(s) para resolver\u001b[0m — siga as setas acima.`);
  console.log("  Guia do Firebase: docs/1-firebase.md · Publicação: docs/2-vercel.md\n");
  process.exitCode = 1;
}
