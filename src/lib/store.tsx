"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Row = Record<string, any>;
export type DataMap = Record<string, Row[]>;

const CACHE_KEY = "gbr.cache.v1";
const QUEUE_KEY = "gbr.queue.v1";

type Op = "create" | "update" | "delete";

/** Mutação pendente: `id` negativo = linha criada localmente e ainda não confirmada. */
type Mutation = {
  table: string;
  op: Op;
  id?: number;
  data?: Row;
  tempId?: number;
};

type MutationInput = { table: string; op: Op; id?: number; data?: Row };

export type SyncStatus = "loading" | "synced" | "offline" | "pending" | "error";

type StoreValue = {
  data: DataMap;
  status: SyncStatus;
  syncedAt: string | null;
  online: boolean;
  pendingCount: number;
  source: string;
  mutate: (m: MutationInput) => Promise<Row | null>;
  table: (name: string) => Row[];
  putSettings: (key: string, value: unknown) => Promise<void>;
  settingsValue: <T>(key: string, fallback: T) => T;
  refresh: () => Promise<void>;
  notifications: { id: string; text: string; tone: string; at: number }[];
  notify: (text: string, tone?: string) => void;
};

const StoreCtx = createContext<StoreValue | null>(null);

/* ------------------------------------------------------------------ storage */

function readCache(): DataMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function readQueue(): Mutation[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let tempSeed = 0;
/** Ids temporários sempre negativos — nunca colidem com as chaves do banco. */
const nextTempId = () => {
  tempSeed += 1;
  return -(Date.now() % 1_000_000) * 10 - (tempSeed % 10) - 1;
};

/* ------------------------------------------------------------- transformação */

/** Aplica uma mutação em uma cópia do mapa de dados (função pura). */
function applyLocal(prev: DataMap, m: Mutation): { next: DataMap; row: Row | null } {
  const list = [...(prev[m.table] || [])];
  let row: Row | null = null;

  if (m.op === "create") {
    row = { id: m.tempId ?? nextTempId(), ...(m.data || {}) };
    list.push(row);
  } else if (m.op === "update") {
    const idx = list.findIndex((r) => r.id === m.id);
    if (idx >= 0) {
      row = { ...list[idx], ...(m.data || {}), id: list[idx].id };
      list[idx] = row;
    }
  } else {
    const idx = list.findIndex((r) => r.id === m.id);
    if (idx >= 0) {
      row = list[idx];
      list.splice(idx, 1);
    }
  }

  return { next: { ...prev, [m.table]: list }, row };
}

/**
 * Troca um id temporário pelo id real devolvido pelo banco, em todo o estado
 * local e nas mutações que ainda estão na fila (ex.: uma OS criada offline e
 * depois referenciada por uma movimentação de estoque).
 */
function remapDeep(value: unknown, from: number, to: number): unknown {
  if (typeof value === "number") return value === from ? to : value;
  if (Array.isArray(value)) return value.map((v) => remapDeep(v, from, to));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = remapDeep(v, from, to);
    return out;
  }
  return value;
}

function remapData(data: DataMap, from: number, to: number): DataMap {
  const out: DataMap = {};
  for (const [table, rows] of Object.entries(data)) {
    out[table] = rows.map((r) => remapDeep(r, from, to) as Row);
  }
  return out;
}

/* ------------------------------------------------------------------ provider */

export function StoreProvider({ children }: { children: ReactNode }) {
  const dataRef = useRef<DataMap>({});
  const [data, setData] = useState<DataMap>({});
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [source, setSource] = useState("postgres");
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<StoreValue["notifications"]>([]);
  const queueRef = useRef<Mutation[]>([]);
  const busyRef = useRef(false);

  /** Único ponto de escrita do estado: mantém ref (síncrono) e React em sincronia. */
  const commit = useCallback((next: DataMap) => {
    dataRef.current = next;
    setData(next);
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* cota do navegador estourada — o app segue funcionando com o estado em memória */
    }
  }, []);

  const persistQueue = useCallback(() => {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queueRef.current));
    } catch {
      /* ignora */
    }
    setPendingCount(queueRef.current.length);
  }, []);

  const notify = useCallback((text: string, tone = "blue") => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((n) => [...n, { id, text, tone, at: Date.now() }]);
    window.setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 4200);
  }, []);

  const remapTempId = useCallback(
    (from: number, to: number) => {
      commit(remapData(dataRef.current, from, to));
      queueRef.current = queueRef.current.map((m) => remapDeep(m, from, to) as Mutation);
      persistQueue();
    },
    [commit, persistQueue],
  );

  /** Envia a fila em ordem. Para no primeiro erro — a fila continua salva. */
  const flush = useCallback(async (): Promise<{ tempId?: number; row?: Row }[]> => {
    if (busyRef.current) return [];
    busyRef.current = true;
    const results: { tempId?: number; row?: Row }[] = [];
    try {
      while (queueRef.current.length) {
        const m = queueRef.current[0];
        const res = await fetch("/api/data", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ table: m.table, op: m.op, id: m.id, data: m.data }),
        });
        if (!res.ok) throw new Error(`sync failed (${res.status})`);
        const json = await res.json().catch(() => ({}));
        const row = (json?.row ?? undefined) as Row | undefined;
        queueRef.current = queueRef.current.slice(1);
        persistQueue();
        if (m.tempId != null && row?.id != null && row.id !== m.tempId) {
          remapTempId(m.tempId, Number(row.id));
        }
        results.push({ tempId: m.tempId, row });
      }
      setStatus((s) => (s === "pending" || s === "loading" ? "synced" : s));
    } catch {
      setStatus("pending");
    } finally {
      busyRef.current = false;
    }
    return results;
  }, [persistQueue, remapTempId]);

  const refresh = useCallback(async () => {
    try {
      const before = dataRef.current.orderMessages?.length ?? 0;
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) throw new Error("bootstrap");
      const json = await res.json();
      const server = (json.data || {}) as DataMap;

      // dados do servidor + alterações que ainda não subiram (não perder nada na tela)
      let merged = server;
      for (const m of queueRef.current) merged = applyLocal(merged, m).next;

      const after = merged.orderMessages?.length ?? 0;
      if (after > before) {
        const lastMsg = [...(merged.orderMessages || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];
        if (lastMsg?.author === "cliente") {
          notify("Nova mensagem de cliente no portal da OS.", "blue");
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification("GBR Soluções", { body: String(lastMsg.body).slice(0, 140) });
            } catch {
              /* permissão negada */
            }
          }
        }
      }

      commit(merged);
      if (json.source) setSource(String(json.source));
      setSyncedAt(json.syncedAt || new Date().toISOString());
      setStatus("synced");
      setOnline(true);
      await flush();
    } catch {
      const cached = readCache();
      if (Object.keys(cached).length) {
        dataRef.current = cached;
        setData(cached);
        setStatus(readQueue().length ? "pending" : "offline");
      } else {
        setStatus("error");
      }
    }
  }, [commit, flush, notify]);

  useEffect(() => {
    queueRef.current = readQueue();
    setPendingCount(queueRef.current.length);
    const cached = readCache();
    if (Object.keys(cached).length) commit(cached);

    void refresh();

    const on = () => {
      setOnline(true);
      void flush();
    };
    const off = () => setOnline(false);
    const maybeRefresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    };
    const interval = window.setInterval(maybeRefresh, 60_000);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", maybeRefresh);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
  }, [commit, flush, refresh]);

  const mutate = useCallback(
    async (m: MutationInput): Promise<Row | null> => {
      const entry: Mutation = { ...m, tempId: m.op === "create" ? nextTempId() : undefined };
      const { next, row } = applyLocal(dataRef.current, entry);
      commit(next);

      // criado e apagado antes de subir: cancela os dois (evita linha órfã no banco)
      if (m.op === "delete" && m.id != null && m.id < 0) {
        const pending = queueRef.current.findIndex((q) => q.op === "create" && q.tempId === m.id);
        if (pending >= 0) {
          queueRef.current = queueRef.current.filter((_, i) => i !== pending);
          persistQueue();
          return row;
        }
      }

      // edição de uma linha que ainda não existe no banco: funde no create pendente
      if (m.op === "update" && m.id != null && m.id < 0) {
        const target = queueRef.current.find((q) => q.op === "create" && q.tempId === m.id);
        if (target) {
          target.data = { ...(target.data || {}), ...(m.data || {}) };
          persistQueue();
          setStatus("pending");
          const results = await flush();
          const created = results.find((r) => r.tempId === m.id)?.row;
          return created ? { ...(row || {}), ...created } : row;
        }
      }

      queueRef.current = [...queueRef.current, entry];
      persistQueue();
      setStatus("pending");

      const results = await flush();
      if (entry.tempId != null) {
        const created = results.find((r) => r.tempId === entry.tempId)?.row;
        if (created?.id != null) return { ...(row || {}), ...created, id: Number(created.id) };
      }
      return row;
    },
    [commit, flush, persistQueue],
  );

  const putSettings = useCallback(
    async (key: string, value: unknown) => {
      await mutate({ table: "settings", op: "create", data: { key, value } });
    },
    [mutate],
  );

  const table = useCallback((name: string) => dataRef.current[name] || data[name] || [], [data]);

  const settingsValue = useCallback(
    <T,>(key: string, fallback: T): T => {
      const row = (data.settings || []).find((r) => r.key === key);
      return (row?.value as T) ?? fallback;
    },
    [data],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      status,
      syncedAt,
      online,
      pendingCount,
      source,
      mutate,
      table,
      putSettings,
      settingsValue,
      refresh,
      notifications,
      notify,
    }),
    [
      data,
      status,
      syncedAt,
      online,
      pendingCount,
      source,
      mutate,
      table,
      putSettings,
      settingsValue,
      refresh,
      notifications,
      notify,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore precisa do StoreProvider");
  return ctx;
}

export function useTable(name: string): Row[] {
  const { table } = useStore();
  return table(name);
}
