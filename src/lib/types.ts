export type OrderStatus =
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  createdAt: number; // epoch ms
}

export type ClientInput = Omit<Client, "id" | "createdAt">;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // BRL
  stock: number; // 0 = não controla estoque (serviços)
  active: boolean;
  createdAt: number; // epoch ms
}

export type ProductInput = Omit<Product, "id" | "createdAt">;

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number; // BRL
}

export interface Order {
  id: string;
  code: number; // número sequencial exibido (#001)
  clientId: string;
  clientName: string;
  status: OrderStatus;
  date: string; // data do pedido (yyyy-mm-dd)
  items: OrderItem[];
  total: number; // BRL
  notes: string;
  createdAt: number; // epoch ms
}

export type OrderInput = Omit<Order, "id" | "createdAt">;

export const ORDER_STATUSES: OrderStatus[] = [
  "pendente",
  "em_andamento",
  "concluido",
  "cancelado",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Classes de badge por status (funcionam nos temas claro e escuro) */
export const ORDER_STATUS_BADGES: Record<OrderStatus, string> = {
  pendente:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30",
  em_andamento:
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-1 ring-inset ring-sky-500/30",
  concluido:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/30",
  cancelado:
    "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/30",
};
