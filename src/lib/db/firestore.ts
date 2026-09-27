import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  TABLE_INFO,
  TABLE_SLUGS,
  type MutationResult,
  type Persistence,
  type PortalPayload,
  type Row,
  type TableSlug,
} from "./types";

/* ------------------------------------------------------------------ conexão */

const META = "_meta";
const BLOBS = "_blobs";
/** Firestore limita 1.048.576 bytes por documento — mantemos folga. */
const DOC_LIMIT = 700_000;

type ServiceAccount = { project_id?: string; client_email?: string; private_key?: string };

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
      return parsed as ServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT não é um JSON válido (cole o conteúdo do arquivo da conta de serviço).");
    }
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      project_id: FIREBASE_PROJECT_ID,
      client_email: FIREBASE_CLIENT_EMAIL,
      private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

export function firebaseConfigured() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

function firebaseApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  // Emulador local (`firebase emulators:start --only firestore`) — sem credenciais
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "demo-gbr" });
  }

  const account = readServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || account?.project_id;

  if (account?.client_email && account?.private_key) {
    return initializeApp({
      credential: cert({ ...account, projectId }),
      projectId,
    });
  }
  // GOOGLE_APPLICATION_CREDENTIALS ou credencial padrão do ambiente (Cloud Run, etc.)
  return initializeApp({ credential: applicationDefault(), projectId });
}

const globalForFs = globalThis as typeof globalThis & { __gbrFirestore?: Firestore };

function fs(): Firestore {
  if (!globalForFs.__gbrFirestore) {
    globalForFs.__gbrFirestore = getFirestore(firebaseApp());
    globalForFs.__gbrFirestore.settings({ ignoreUndefinedProperties: true });
  }
  return globalForFs.__gbrFirestore;
}

/* -------------------------------------------------------- serialização */

const isTimestamp = (v: unknown): v is Timestamp =>
  typeof v === "object" && v !== null && typeof (v as Timestamp).toMillis === "function";

function toFirestore(table: TableSlug, data: Row): Row {
  const out: Row = { ...data };
  delete out.id;
  for (const key of TABLE_INFO[table].dateFields) {
    const value = out[key];
    if (value === undefined) continue;
    if (value === null || value === "") {
      out[key] = null;
      continue;
    }
    const date = value instanceof Date ? value : new Date(String(value));
    out[key] = Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  }
  return out;
}

function fromFirestore(id: string, data: Row): Row {
  const numeric = Number(id);
  const out: Row = { ...data, id: Number.isNaN(numeric) ? id : numeric };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (isTimestamp(value)) out[key] = value.toDate().toISOString();
  }
  return out;
}

/* ------------------------------------------------- campos grandes (fotos) */

type BlobRef = { __blob: string };

const isBlobRef = (v: unknown): v is BlobRef =>
  typeof v === "object" && v !== null && typeof (v as BlobRef).__blob === "string";

function splitLargeFields(table: TableSlug, id: number, data: Row) {
  const blobs: { path: string; value: string }[] = [];
  const out: Row = { ...data };

  const visit = (value: unknown, path: string[]): unknown => {
    if (typeof value === "string" && value.length > 60_000) {
      const blobPath = `${table}_${id}_${path.join("_")}`.replace(/[^\w-]/g, "").slice(0, 900);
      blobs.push({ path: blobPath, value });
      return { __blob: blobPath } satisfies BlobRef;
    }
    if (Array.isArray(value)) return value.map((v, i) => visit(v, [...path, String(i)]));
    return value;
  };

  if (JSON.stringify(out).length > DOC_LIMIT) {
    for (const key of Object.keys(out)) {
      out[key] = visit(out[key], [key]);
    }
    if (blobs.length) out.__blobs = blobs.map((b) => b.path);
  }
  return { data: out, blobs };
}

async function resolveBlobs(data: Row): Promise<Row> {
  const paths = (data.__blobs || []) as string[];
  if (!Array.isArray(paths) || !paths.length) return data;
  const db = fs();
  const snapshot = await db.getAll(...paths.map((p) => db.collection(BLOBS).doc(p)));
  const map = new Map<string, string>();
  snapshot.forEach((doc) => map.set(doc.id, String((doc.data() as Row)?.value ?? "")));

  const restore = (value: unknown): unknown => {
    if (isBlobRef(value)) return map.get(value.__blob) ?? "";
    if (Array.isArray(value)) return value.map(restore);
    return value;
  };
  const out: Row = { ...data };
  delete out.__blobs;
  for (const key of Object.keys(out)) out[key] = restore(out[key]);
  return out;
}

/* ------------------------------------------------------------------ driver */

export function createFirestoreStore(): Persistence {
  const db = fs();
  const col = (table: TableSlug) => db.collection(table);

  /**
   * Marca que algo mudou. O app usa isso para perguntar "mudou algo?" gastando
   * UMA leitura em vez de reler todas as coleções — o plano gratuito do
   * Firestore cobra por documento lido, então isso faz muita diferença.
   */
  async function bumpVersion() {
    try {
      await db
        .collection(META)
        .doc("version")
        .set({ v: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` });
    } catch (err) {
      console.error("bumpVersion failed", err);
    }
  }

  /** Reserva N ids numéricos sequenciais (mantém compatibilidade com o app). */
  async function reserveIds(table: TableSlug, count: number): Promise<number> {
    const ref = db.collection(META).doc("counters");
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = Number((snap.data() as Row)?.[table] ?? 0);
      tx.set(ref, { [table]: current + count }, { merge: true });
      return current + 1;
    });
  }

  async function writeDocs(table: TableSlug, rows: Row[]): Promise<Row[]> {
    if (!rows.length) return [];
    const first = await reserveIds(table, rows.length);
    const written: Row[] = [];
    let batch = db.batch();
    let pending = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const id = first + i;
      const prepared = toFirestore(table, rows[i]);
      const { data, blobs } = splitLargeFields(table, id, prepared);
      const ref = col(table).doc(String(id));
      batch.set(ref, data as never);
      pending += 1;
      for (const blob of blobs) batch.set(db.collection(BLOBS).doc(blob.path), { value: blob.value });
      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
      written.push({ ...rows[i], id });
    }
    if (pending) await batch.commit();
    await bumpVersion();
    return written;
  }

  async function listOne(table: TableSlug): Promise<Row[]> {
    const snap = await col(table).get();
    const rows = await Promise.all(
      snap.docs.map(async (doc) => {
        const row = await resolveBlobs(fromFirestore(doc.id, doc.data() as Row));
        if (table === "settings") row.key = doc.id; // o id do documento é a chave
        return row;
      }),
    );
    return rows.sort((a, b) => {
      const an = Number(a.id);
      const bn = Number(b.id);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn; // ids numéricos (demais tabelas)
      return String(a.key ?? a.id).localeCompare(String(b.key ?? b.id)); // settings (chave textual)
    });
  }

  return {
    kind: "firestore",
    label: `Firestore · ${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "firebase"}`,

    list: listOne,

    async listAll() {
      const data: Record<string, Row[]> = {};
      await Promise.all(
        TABLE_SLUGS.map(async (slug) => {
          data[slug] = await listOne(slug);
        }),
      );
      return data;
    },

    insertMany: writeDocs,

    async version() {
      const snap = await db.collection(META).doc("version").get();
      return snap.exists ? String((snap.data() as Row)?.v ?? "0") : null;
    },

    async isSeeded() {
      const snap = await db.collection(META).doc("seed").get();
      return snap.exists;
    },

    async create(table, data) {
      if (table === "settings") {
        const key = String(data.key);
        await col("settings").doc(key).set({ value: data.value } as never);
        await bumpVersion();
        return { row: { key, value: data.value } as Row };
      }

      const [row] = await writeDocs(table, [data]);
      if (table === "stockMoves" && row) {
        const delta = row.type === "in" ? Number(row.quantity) : -Number(row.quantity);
        const itemRef = col("stock").doc(String(row.stockId));
        const item = await itemRef.get();
        if (item.exists) {
          const quantity = Number((item.data() as Row)?.quantity ?? 0);
          const updated = { quantity: Math.max(0, quantity + delta), updatedAt: Timestamp.now() };
          await itemRef.update(updated);
          const stockRow = fromFirestore(item.id, { ...(item.data() as Row), ...updated });
          return { row, related: [{ table: "stock", rows: [stockRow] }] };
        }
      }
      return { row };
    },

    async update(table, id, data) {
      const ref =
        table === "settings"
          ? col("settings").doc(String((data as Row).key ?? id))
          : col(table).doc(String(id));
      const snap = await ref.get();
      if (!snap.exists && table !== "settings") return null;

      // remove blobs antigos e grava os novos campos grandes
      await removeBlobsData(String(id), table, snap.data() as Row | undefined);
      const prepared = toFirestore(table, { ...(snap.data() ?? {}), ...data });
      const { data: docData, blobs } = splitLargeFields(table, Number(id), prepared);
      await ref.set(docData as never, { merge: false });
      for (const blob of blobs) await db.collection(BLOBS).doc(blob.path).set({ value: blob.value });
      await bumpVersion();
      const saved = await resolveBlobs(fromFirestore(String(id), docData));
      return { row: saved };
    },

    async remove(table, id) {
      const ref = table === "settings" ? col("settings").doc(String(id)) : col(table).doc(String(id));
      const snap = await ref.get();
      if (snap.exists) await removeBlobsData(String(id), table, snap.data() as Row | undefined);
      await ref.delete();
      await bumpVersion();
    },

    async upsertSetting(key, value) {
      await col("settings").doc(key).set({ value } as never);
      await bumpVersion();
      return { key, value } as Row;
    },

    async findOrderByToken(token): Promise<PortalPayload | null> {
      const snap = await col("orders").where("token", "==", token).limit(1).get();
      if (snap.empty) return null;
      const order = await resolveBlobs(fromFirestore(snap.docs[0].id, snap.docs[0].data() as Row));

      let client: Row | null = null;
      if (order.clientId != null) {
        const c = await col("clients").doc(String(order.clientId)).get();
        if (c.exists) client = fromFirestore(c.id, c.data() as Row);
      }

      const msgSnap = await col("orderMessages").where("orderId", "==", Number(order.id)).get();
      const messages = msgSnap.docs
        .map((d) => fromFirestore(d.id, d.data() as Row))
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      return { order, client, messages };
    },

    async addOrderMessage(orderId, body) {
      await writeDocs("orderMessages", [
        { orderId, author: "cliente", body: body.trim().slice(0, 1200), createdAt: new Date().toISOString() },
      ]);
    },

    async updateOrder(orderId, patch) {
      const ref = col("orders").doc(String(orderId));
      const snap = await ref.get();
      if (!snap.exists) return;
      const prepared = toFirestore("orders", { ...(snap.data() ?? {}), ...patch });
      const { data, blobs } = splitLargeFields("orders", Number(orderId), prepared);
      await ref.set(data as never, { merge: false });
      for (const blob of blobs) await db.collection(BLOBS).doc(blob.path).set({ value: blob.value });
      await bumpVersion();
    },

    async markSeeded() {
      await db.collection(META).doc("seed").set({ at: Timestamp.now() });
    },

    async ping() {
      await db.collection(META).doc("health").get();
    },
  };

  /** Apaga os blobs de um documento antes de sobrescrevê-lo. */
  async function removeBlobsData(id: string, table: TableSlug, data?: Row) {
    const paths = (data?.__blobs || []) as string[];
    if (!paths.length) return;
    const batch = db.batch();
    for (const path of paths) batch.delete(db.collection(BLOBS).doc(path));
    await batch.commit();
    void id;
    void table;
  }
}
