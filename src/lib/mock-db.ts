import type { Client, Order, OrderStatus, Product } from "./types";

/**
 * Banco de dados local do MODO DEMONSTRAÇÃO.
 * Usado quando as variáveis NEXT_PUBLIC_FIREBASE_* não estão configuradas.
 * Persiste no localStorage do navegador — nenhum dado sai do aparelho.
 */

const STORAGE_KEY = "gbr-demo-db-v1";

export interface DemoDb {
  clients: Client[];
  products: Product[];
  orders: Order[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data ISO (yyyy-mm-dd) de N meses atrás, sempre no passado */
function dateIso(monthsAgo: number, day: number): string {
  const now = new Date();
  const maxDay = monthsAgo === 0 ? Math.max(1, now.getDate() - 1) : 28;
  const d = new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo,
    Math.min(day, maxDay)
  );
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Epoch (ms) de N meses atrás às 10h30 */
function epochAt(monthsAgo: number, day: number): number {
  const [y, m, d] = dateIso(monthsAgo, day).split("-").map(Number);
  return new Date(y, m - 1, d, 10, 30).getTime();
}

/** Dados fictícios — substitua/limpe em Configurações → Dados */
function seed(): DemoDb {
  const clients: Client[] = [
    { id: "cl-ana", name: "Ana Beatriz Lima", phone: "(11) 98812-3344", email: "ana.lima@email.com", city: "Guarulhos", notes: "Prefere contato por WhatsApp.", createdAt: epochAt(11, 3) },
    { id: "cl-carlos", name: "Carlos Eduardo Souza", phone: "(11) 97645-2210", email: "carlos.souza@email.com", city: "Arujá", notes: "", createdAt: epochAt(10, 14) },
    { id: "cl-fernanda", name: "Fernanda Ribeiro", phone: "(11) 99120-8455", email: "fer.ribeiro@email.com", city: "São Paulo", notes: "Cliente desde 2023.", createdAt: epochAt(9, 22) },
    { id: "cl-joao", name: "João Vitor Nogueira", phone: "(11) 96533-1129", email: "jvnogueira@email.com", city: "Santa Isabel", notes: "", createdAt: epochAt(8, 8) },
    { id: "cl-mariana", name: "Mariana Alves", phone: "(11) 98450-7712", email: "mari.alves@email.com", city: "Itaquaquecetuba", notes: "Indicação da Fernanda.", createdAt: epochAt(6, 17) },
    { id: "cl-rafael", name: "Rafael Mendes", phone: "(11) 97321-4408", email: "rafa.mendes@email.com", city: "Mogi das Cruzes", notes: "", createdAt: epochAt(5, 5) },
    { id: "cl-patricia", name: "Patrícia Gomes", phone: "(11) 99887-2211", email: "patricia.gomes@email.com", city: "Guarulhos", notes: "", createdAt: epochAt(3, 12) },
    { id: "cl-luciana", name: "Luciana Ferreira", phone: "(11) 96001-3355", email: "luciana.f@email.com", city: "São Paulo", notes: "Fatura sempre no cartão.", createdAt: epochAt(1, 19) },
  ];

  const products: Product[] = [
    { id: "pr-svc-padrao", name: "Serviço padrão", category: "Serviços", price: 120, stock: 0, active: true, createdAt: epochAt(11, 1) },
    { id: "pr-svc-premium", name: "Serviço premium", category: "Serviços", price: 250, stock: 0, active: true, createdAt: epochAt(11, 1) },
    { id: "pr-consultoria", name: "Consultoria avulsa", category: "Serviços", price: 180, stock: 0, active: true, createdAt: epochAt(10, 9) },
    { id: "pr-manutencao", name: "Manutenção", category: "Serviços", price: 80, stock: 0, active: true, createdAt: epochAt(9, 2) },
    { id: "pr-kit-inicial", name: "Kit inicial", category: "Produtos", price: 59.9, stock: 35, active: true, createdAt: epochAt(8, 20) },
    { id: "pr-kit-completo", name: "Kit completo", category: "Produtos", price: 199.9, stock: 12, active: true, createdAt: epochAt(7, 7) },
    { id: "pr-item-avulso", name: "Item avulso", category: "Produtos", price: 25.9, stock: 80, active: true, createdAt: epochAt(6, 25) },
    { id: "pr-pacote-mensal", name: "Pacote mensal", category: "Assinaturas", price: 99.9, stock: 0, active: true, createdAt: epochAt(4, 10) },
    { id: "pr-pacote-trimestral", name: "Pacote trimestral", category: "Assinaturas", price: 269.9, stock: 0, active: true, createdAt: epochAt(2, 15) },
  ];

  // [meses atrás, dia, índice do cliente, status, [[índice do produto, qtd], ...]]
  const orderSpecs: Array<
    [number, number, number, OrderStatus, Array<[number, number]>]
  > = [
    [5, 4, 0, "concluido", [[0, 1]]],
    [5, 11, 1, "concluido", [[0, 2], [4, 1]]],
    [5, 21, 2, "concluido", [[1, 1]]],
    [4, 6, 3, "concluido", [[2, 1], [6, 2]]],
    [4, 14, 0, "concluido", [[0, 1], [1, 1]]],
    [4, 26, 4, "concluido", [[5, 1]]],
    [3, 8, 2, "concluido", [[3, 2]]],
    [3, 16, 5, "concluido", [[0, 3]]],
    [3, 24, 1, "cancelado", [[7, 1]]],
    [2, 5, 6, "concluido", [[1, 1], [5, 1]]],
    [2, 13, 0, "concluido", [[2, 2]]],
    [2, 22, 4, "concluido", [[0, 1], [4, 2]]],
    [1, 3, 7, "concluido", [[1, 2], [8, 1]]],
    [1, 12, 3, "concluido", [[0, 2]]],
    [1, 19, 5, "concluido", [[6, 4], [3, 1]]],
    [1, 27, 2, "concluido", [[5, 2]]],
    [0, 2, 0, "concluido", [[0, 1], [7, 1]]],
    [0, 5, 6, "em_andamento", [[1, 1]]],
    [0, 8, 1, "pendente", [[2, 1], [4, 1]]],
    [0, 11, 4, "concluido", [[0, 2], [6, 1]]],
    [0, 15, 7, "pendente", [[8, 1]]],
    [0, 18, 3, "em_andamento", [[1, 1], [5, 1]]],
  ];

  const orders: Order[] = orderSpecs.map((spec, i) => {
    const [monthsAgo, day, clientIdx, status, itemSpecs] = spec;
    const client = clients[clientIdx];
    const items = itemSpecs.map(([pIdx, qty]) => {
      const product = products[pIdx];
      return {
        productId: product.id,
        name: product.name,
        qty,
        unitPrice: product.price,
      };
    });
    const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    return {
      id: `or-${1000 + i}`,
      code: i + 1,
      clientId: client.id,
      clientName: client.name,
      status,
      date: dateIso(monthsAgo, day),
      items,
      total,
      notes: "",
      createdAt: epochAt(monthsAgo, day),
    };
  });

  return { clients, products, orders };
}

export function seedDemoDb(): DemoDb {
  return seed();
}

export function loadDemoDb(): DemoDb {
  if (typeof window === "undefined") {
    return { clients: [], products: [], orders: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (
        parsed &&
        Array.isArray(parsed.clients) &&
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.orders)
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("[demo] falha ao ler dados locais — usando seed.", error);
  }
  const fresh = seed();
  saveDemoDb(fresh);
  return fresh;
}

export function saveDemoDb(db: DemoDb): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function clearDemoStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
