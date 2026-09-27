import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "./firebase";
import {
  clearDemoStorage,
  loadDemoDb,
  saveDemoDb,
  seedDemoDb,
  type DemoDb,
} from "./mock-db";
import type {
  Client,
  ClientInput,
  Order,
  OrderInput,
  Product,
  ProductInput,
} from "./types";

/**
 * Camada de dados do painel.
 *
 * - Firebase configurado (variáveis NEXT_PUBLIC_FIREBASE_*) → Firestore em tempo real.
 * - Sem configuração → MODO DEMONSTRAÇÃO com dados fictícios no localStorage.
 *
 * As telas não sabem (nem precisam saber) qual backend está ativo.
 */

export type Unsubscribe = () => void;

/* ============================================================
   Infra do modo demonstração
   ============================================================ */

const demoListeners = new Set<() => void>();

function subscribeDemo<K extends keyof DemoDb>(
  key: K,
  cb: (rows: DemoDb[K]) => void
): Unsubscribe {
  const emit = () => cb(loadDemoDb()[key]);
  demoListeners.add(emit);
  emit();
  return () => {
    demoListeners.delete(emit);
  };
}

function mutateDemo(mutator: (db: DemoDb) => void): void {
  const db = loadDemoDb();
  mutator(db);
  saveDemoDb(db);
  demoListeners.forEach((emit) => emit());
}

/** Restaura os dados fictícios originais (apenas modo demo) */
export function resetDemoData(): void {
  saveDemoDb(seedDemoDb());
  demoListeners.forEach((emit) => emit());
}

/** Limpa todos os dados locais (apenas modo demo) */
export function clearDemoData(): void {
  clearDemoStorage();
  saveDemoDb({ clients: [], products: [], orders: [] });
  demoListeners.forEach((emit) => emit());
}

/* ============================================================
   Clientes
   ============================================================ */

export function subscribeClients(cb: (rows: Client[]) => void): Unsubscribe {
  if (isFirebaseConfigured) {
    const q = query(collection(getFirestoreDb(), "clients"), orderBy("name"));
    return onSnapshot(
      q,
      (snap) =>
        cb(
          snap.docs.map((d) => ({
            ...(d.data() as Omit<Client, "id">),
            id: d.id,
          }))
        ),
      (error) => {
        console.error("[firestore] clientes:", error);
        cb([]);
      }
    );
  }
  return subscribeDemo("clients", (rows) =>
    cb(
      [...(rows as Client[])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      )
    )
  );
}

export async function saveClient(
  input: ClientInput,
  id?: string
): Promise<string> {
  if (isFirebaseConfigured) {
    if (id) {
      await setDoc(doc(getFirestoreDb(), "clients", id), input, { merge: true });
      return id;
    }
    const ref = await addDoc(collection(getFirestoreDb(), "clients"), {
      ...input,
      createdAt: Date.now(),
    });
    return ref.id;
  }
  let newId = id ?? `cl-${Date.now().toString(36)}`;
  mutateDemo((db) => {
    if (id) {
      const idx = db.clients.findIndex((c) => c.id === id);
      if (idx >= 0) db.clients[idx] = { ...db.clients[idx], ...input };
    } else {
      db.clients.push({ id: newId, ...input, createdAt: Date.now() });
    }
  });
  return newId;
}

export async function deleteClient(id: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(getFirestoreDb(), "clients", id));
    return;
  }
  mutateDemo((db) => {
    db.clients = db.clients.filter((c) => c.id !== id);
  });
}

/* ============================================================
   Produtos
   ============================================================ */

export function subscribeProducts(cb: (rows: Product[]) => void): Unsubscribe {
  if (isFirebaseConfigured) {
    const q = query(
      collection(getFirestoreDb(), "products"),
      orderBy("name")
    );
    return onSnapshot(
      q,
      (snap) =>
        cb(
          snap.docs.map((d) => ({
            ...(d.data() as Omit<Product, "id">),
            id: d.id,
          }))
        ),
      (error) => {
        console.error("[firestore] produtos:", error);
        cb([]);
      }
    );
  }
  return subscribeDemo("products", (rows) =>
    cb(
      [...(rows as Product[])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      )
    )
  );
}

export async function saveProduct(
  input: ProductInput,
  id?: string
): Promise<string> {
  if (isFirebaseConfigured) {
    if (id) {
      await setDoc(doc(getFirestoreDb(), "products", id), input, {
        merge: true,
      });
      return id;
    }
    const ref = await addDoc(collection(getFirestoreDb(), "products"), {
      ...input,
      createdAt: Date.now(),
    });
    return ref.id;
  }
  const newId = id ?? `pr-${Date.now().toString(36)}`;
  mutateDemo((db) => {
    if (id) {
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx >= 0) db.products[idx] = { ...db.products[idx], ...input };
    } else {
      db.products.push({ id: newId, ...input, createdAt: Date.now() });
    }
  });
  return newId;
}

export async function deleteProduct(id: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(getFirestoreDb(), "products", id));
    return;
  }
  mutateDemo((db) => {
    db.products = db.products.filter((p) => p.id !== id);
  });
}

/* ============================================================
   Pedidos
   ============================================================ */

function sortOrders(rows: Order[]): Order[] {
  return [...rows].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.code - a.code
  );
}

export function subscribeOrders(cb: (rows: Order[]) => void): Unsubscribe {
  if (isFirebaseConfigured) {
    const q = query(collection(getFirestoreDb(), "orders"), orderBy("date", "desc"));
    return onSnapshot(
      q,
      (snap) =>
        cb(
          sortOrders(
            snap.docs.map((d) => ({
              ...(d.data() as Omit<Order, "id">),
              id: d.id,
            }))
          )
        ),
      (error) => {
        console.error("[firestore] pedidos:", error);
        cb([]);
      }
    );
  }
  return subscribeDemo("orders", (rows) => cb(sortOrders(rows as Order[])));
}

export async function saveOrder(
  input: OrderInput,
  id?: string
): Promise<string> {
  if (isFirebaseConfigured) {
    if (id) {
      await setDoc(doc(getFirestoreDb(), "orders", id), input, { merge: true });
      return id;
    }
    const ref = await addDoc(collection(getFirestoreDb(), "orders"), {
      ...input,
      createdAt: Date.now(),
    });
    return ref.id;
  }
  const newId = id ?? `or-${Date.now().toString(36)}`;
  mutateDemo((db) => {
    if (id) {
      const idx = db.orders.findIndex((o) => o.id === id);
      if (idx >= 0) db.orders[idx] = { ...db.orders[idx], ...input };
    } else {
      db.orders.push({ id: newId, ...input, createdAt: Date.now() });
    }
  });
  return newId;
}

export async function deleteOrder(id: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(getFirestoreDb(), "orders", id));
    return;
  }
  mutateDemo((db) => {
    db.orders = db.orders.filter((o) => o.id !== id);
  });
}
