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

type Mutation = { table: string; op: "create" | "update" | "delete"; id?: number; data?: Row; tempId?: number };

type StoreValue = {
  data: DataMap;
  status: "loading" | "synced" | "offline" | "pending" | "error";
  syncedAt: string | null;
  online: boolean;
  mutate: (m: Omit<Mutation, "tempId">) => Promise<Row | null>;
  table: (name: string) => Row[];
  putSettings: (key: string, value: unknown) => Promise<void>;
  settingsValue: <T>(key: string, fallback: T) => T;
  refresh: () => Promise<void>;
  notifications: { id: string; text: string; tone: string; at: number }[];
  notify: (text: string, tone?: string) => void;
};

const StoreCtx = createContext<StoreValue | null>(null);

function readCache(): DataMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(data: DataMap) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function readQueue(): Mutation[] {
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataMap>({});
  const [status, setStatus] = useState<StoreValue["status"]>("loading");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [notifications, setNotifications] = useState<StoreValue["notifications"]>([]);
  const queueRef = useRef<Mutation[]>([]);
  const busyRef = useRef(false);
  const dataRef = useRef<DataMap>({});

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const notify = useCallback((text: string, tone = "blue") => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((n) => [...n, { id, text, tone, at: Date.now() }]);
    window.setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 4200);
  }, []);

  /** Envia a fila de mutações; devolve {tempId -> row} para remapear ids locais. */
  const flush = useCallback(async (): Promise<{ tempId?: number; row?: Row }[]> => {
    if (busyRef.current) return [];
    busyRef.current = true;
    const results: { tempId?: number; row?: Row }[] = [];
    try {
      let q = readQueue();
      while (q.length) {
        const m = q[0];
        const res = await fetch("/api/data", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(m),
        });
        if (!res.ok) throw new Error("sync failed");
        const json = await res.json().catch(() => ({}));
        results.push({ tempId: m.tempId, row: json.row });
        q = q.slice(1);
        window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      }
      queueRef.current = [];
      setStatus((s) => (s === "pending" ? "synced" : s));
      // substitui ids temporários pelos ids reais gravados no banco
      if (results.some((r) => r.tempId != null && r.row?.id != null)) {
        setData((prev) => {
          const next: DataMap = {};
          for (const [key, rows] of Object.entries(prev)) {
            next[key] = rows.map((row) => {
              const hit = results.find((r) => r.tempId != null && r.tempId === row.id && r.row?.id != null);
              return hit ? { ...row, ...(hit.row as Row), id: (hit.row as Row).id } : row;
            });
          }
          writeCache(next);
          return next;
        });
      }
    } catch {
      setStatus("pending");
    } finally {
      busyRef.current = false;
    }
    return results;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const before = dataRef.current.orderMessages?.length ?? 0;
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) throw new Error("bootstrap");
      const json = await res.json();
      const nextData = json.data as DataMap;
      const after = nextData.orderMessages?.length ?? 0;
      if (after > before) {
        const lastMsg = [...(nextData.orderMessages || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];
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
      setData(nextData);
      writeCache(nextData);
      setSyncedAt(json.syncedAt);
      setStatus("synced");
      setOnline(true);
      await flush();
    } catch {
      const cached = readCache();
      if (Object.keys(cached).length) {
        setData(cached);
        setStatus(readQueue().length ? "pending" : "offline");
      } else {
        setStatus("error");
      }
    }
  }, [flush]);

  useEffect(() => {
    const cached = readCache();
    if (Object.keys(cached).length) setData(cached);
    void refresh();
    const on = () => {
      setOnline(true);
      void flush();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh, flush]);

  const mutate = useCallback(
    async (m: Omit<Mutation, "tempId">) => {
      let result: Row | null = null;
      setData((prev) => {
        const list = [...(prev[m.table] || [])];
        if (m.op === "create") {
          const tempId = -Math.floor(Math.random() * 1e6);
          result = { id: tempId, ...(m.data || {}) };
          list.push(result);
        } else if (m.op === "update") {
          const idx = list.findIndex((r) => r.id === m.id);
          if (idx >= 0) {
            result = { ...list[idx], ...(m.data || {}) };
            list[idx] = result;
          }
        } else {
          const idx = list.findIndex((r) => r.id === m.id);
          if (idx >= 0) result = list[idx];
          list.splice(idx, 1);
        }
        const next = { ...prev, [m.table]: list };
        writeCache(next);
        return next;
      });

      const tempId = m.op === "create" ? (result as Row | null)?.id : undefined;
      const queue = [...readQueue(), { ...(m as Mutation), tempId }];
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setStatus("pending");
      const results = await flush();
      const synced = tempId != null ? results.find((r) => r.tempId === tempId)?.row : undefined;
      return synced ? { ...(result || {}), ...synced, id: synced.id } : result;
    },
    [flush],
  );

  const putSettings = useCallback(
    async (key: string, value: unknown) => {
      await mutate({ table: "settings", op: "create", data: { key, value } });
    },
    [mutate],
  );

  const table = useCallback((name: string) => data[name] || [], [data]);

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
      mutate,
      table,
      putSettings,
      settingsValue,
      refresh,
      notifications,
      notify,
    }),
    [data, status, syncedAt, online, mutate, table, putSettings, settingsValue, refresh, notifications, notify],
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
