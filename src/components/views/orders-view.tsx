"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useClients, useOrders, useProducts } from "@/lib/hooks";
import { deleteOrder, saveOrder } from "@/lib/db";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/lib/types";
import {
  brl,
  formatDate,
  parseDecimal,
  todayISO,
  toEditableDecimal,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { RowIconButton } from "./clients-view";
import { cn } from "@/lib/utils";

interface OrderItemForm {
  productId: string;
  qty: string;
  unitPrice: string;
}

interface OrderFormState {
  clientId: string;
  status: OrderStatus;
  date: string;
  notes: string;
  items: OrderItemForm[];
}

function emptyItem(): OrderItemForm {
  return { productId: "", qty: "1", unitPrice: "" };
}

function defaultForm(): OrderFormState {
  return {
    clientId: "",
    status: "pendente",
    date: todayISO(),
    notes: "",
    items: [emptyItem()],
  };
}

export function OrdersView() {
  const { orders, loading } = useOrders();
  const { clients } = useClients();
  const { products } = useProducts();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">(
    "todos"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState<OrderFormState>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const autoOpened = useRef(false);

  /** Produtos selecionáveis: ativos + itens já usados no pedido em edição */
  const selectableProducts = useMemo(() => {
    const list = products ?? [];
    const active = list.filter((p) => p.active);
    if (!editing) return active;
    const editingIds = new Set(editing.items.map((i) => i.productId));
    return [
      ...active,
      ...list.filter((p) => !p.active && editingIds.has(p.id)),
    ];
  }, [products, editing]);

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (statusFilter !== "todos")
      list = list.filter((o) => o.status === statusFilter);
    const term = search.trim().toLowerCase().replace(/^#/, "");
    if (term)
      list = list.filter(
        (o) =>
          o.clientName.toLowerCase().includes(term) ||
          String(o.code).includes(term)
      );
    return list;
  }, [orders, statusFilter, search]);

  // Abre automaticamente o formulário ao chegar com ?novo=1
  useEffect(() => {
    if (autoOpened.current || clients === null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("novo") === "1") {
      autoOpened.current = true;
      setEditing(null);
      setForm(defaultForm());
      setFormError(null);
      setDialogOpen(true);
    }
  }, [clients]);

  function openNew() {
    setEditing(null);
    setForm(defaultForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(order: Order) {
    setEditing(order);
    setForm({
      clientId: order.clientId,
      status: order.status,
      date: order.date,
      notes: order.notes,
      items: order.items.map((i) => ({
        productId: i.productId,
        qty: String(i.qty),
        unitPrice: toEditableDecimal(i.unitPrice),
      })),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function setItem(index: number, patch: Partial<OrderItemForm>) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  }

  function selectProduct(index: number, productId: string) {
    const product = selectableProducts.find((p) => p.id === productId);
    setItem(index, {
      productId,
      unitPrice: product ? toEditableDecimal(product.price) : "",
    });
  }

  const formTotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + (Math.floor(Number(item.qty) || 0)) * parseDecimal(item.unitPrice),
        0
      ),
    [form.items]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.clientId) {
      setFormError("Selecione o cliente do pedido.");
      return;
    }
    const filledItems = form.items.filter((i) => i.productId);
    if (filledItems.length === 0) {
      setFormError("Adicione pelo menos um item ao pedido.");
      return;
    }
    if (filledItems.some((i) => Math.floor(Number(i.qty) || 0) < 1)) {
      setFormError("Verifique as quantidades — cada item precisa de ao menos 1 unidade.");
      return;
    }

    const client = (clients ?? []).find((c) => c.id === form.clientId);
    if (!client) {
      setFormError("Cliente não encontrado. Tente novamente.");
      return;
    }

    const mappedItems = filledItems.map((item) => {
      const product = (products ?? []).find(
        (p) => p.id === item.productId
      );
      return {
        productId: item.productId,
        name: product?.name ?? "Item",
        qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
        unitPrice: parseDecimal(item.unitPrice),
      };
    });
    const total = mappedItems.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );
    const nextCode = editing
      ? editing.code
      : (orders ?? []).reduce((max, o) => Math.max(max, o.code), 0) + 1;

    setSaving(true);
    try {
      await saveOrder(
        {
          code: nextCode,
          clientId: form.clientId,
          clientName: client.name,
          status: form.status,
          date: form.date || todayISO(),
          items: mappedItems,
          total,
          notes: form.notes.trim(),
        },
        editing?.id
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("[pedidos] erro ao salvar:", error);
      setFormError("Não foi possível salvar o pedido. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickComplete(order: Order) {
    setQuickId(order.id);
    try {
      await saveOrder(
        {
          code: order.code,
          clientId: order.clientId,
          clientName: order.clientName,
          status: "concluido",
          date: order.date,
          items: order.items,
          total: order.total,
          notes: order.notes,
        },
        order.id
      );
    } catch (error) {
      console.error("[pedidos] erro ao concluir:", error);
    } finally {
      setQuickId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteOrder(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("[pedidos] erro ao excluir:", error);
    } finally {
      setDeleteLoading(false);
    }
  }

  const hasClients = (clients ?? []).length > 0;
  const hasProducts = selectableProducts.length > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Carregando…"
              : `${orders?.length ?? 0} ${
                  orders?.length === 1 ? "pedido registrado" : "pedidos registrados"
                }`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo pedido
        </Button>
      </header>

      {/* Filtros por status (rolagem horizontal no celular) */}
      <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(["todos", ...ORDER_STATUSES] as const).map((status) => {
          const active = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-pressed={active}
            >
              {status === "todos" ? "Todos" : ORDER_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por cliente ou número do pedido…"
        inputMode="search"
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search.trim() || statusFilter !== "todos" ? SearchX : ShoppingCart}
          title="Nenhum pedido encontrado"
          description={
            search.trim() || statusFilter !== "todos"
              ? "Ajuste os filtros ou registre um novo pedido."
              : "Registre o primeiro pedido para começar a acompanhar o faturamento."
          }
          action={
            search.trim() || statusFilter !== "todos" ? null : (
              <Button onClick={openNew} size="sm" className="mt-1">
                <Plus className="h-4 w-4" aria-hidden />
                Criar pedido
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Tabela — desktop */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Pedido</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Itens</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-accent/40"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium">
                          #{String(order.code).padStart(3, "0")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.date)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">{order.clientName}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {order.items.length === 1
                          ? "1 item"
                          : `${order.items.length} itens`}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3.5 font-semibold">
                        {brl(order.total)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          {order.status === "pendente" ||
                          order.status === "em_andamento" ? (
                            <RowIconButton
                              label={`Concluir pedido ${order.code}`}
                              onClick={() => handleQuickComplete(order)}
                            >
                              {quickId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </RowIconButton>
                          ) : null}
                          <RowIconButton
                            label={`Editar pedido ${order.code}`}
                            onClick={() => openEdit(order)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowIconButton>
                          <RowIconButton
                            label={`Excluir pedido ${order.code}`}
                            danger
                            onClick={() => setDeletingId(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </RowIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Lista de cards — celular */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      #{String(order.code).padStart(3, "0")} ·{" "}
                      {order.clientName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(order.date)} ·{" "}
                      {order.items.length === 1
                        ? "1 item"
                        : `${order.items.length} itens`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold">
                      {brl(order.total)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  {order.status === "pendente" ||
                  order.status === "em_andamento" ? (
                    <button
                      type="button"
                      onClick={() => handleQuickComplete(order)}
                      disabled={quickId === order.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-accent disabled:opacity-50 dark:text-emerald-400"
                    >
                      {quickId === order.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Concluir
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-1">
                    <RowIconButton
                      label={`Editar pedido ${order.code}`}
                      onClick={() => openEdit(order)}
                    >
                      <Pencil className="h-4 w-4" />
                    </RowIconButton>
                    <RowIconButton
                      label={`Excluir pedido ${order.code}`}
                      danger
                      onClick={() => setDeletingId(order.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowIconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Formulário (novo/editar) */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          editing
            ? `Editar pedido #${String(editing.code).padStart(3, "0")}`
            : "Novo pedido"
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="order-form" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {editing ? "Salvar alterações" : "Registrar pedido"}
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="space-y-5">
          {!hasClients ? (
            <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400">
              Cadastre um cliente antes de registrar pedidos (aba Clientes).
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cliente" htmlFor="order-client">
              <Select
                id="order-client"
                value={form.clientId}
                onChange={(e) =>
                  setForm({ ...form, clientId: e.target.value })
                }
              >
                <option value="" disabled>
                  Selecione o cliente…
                </option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data do pedido" htmlFor="order-date">
              <Input
                id="order-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Status" htmlFor="order-status">
            <Select
              id="order-status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as OrderStatus })
              }
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          {/* Itens do pedido */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Itens do pedido</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    items: [...prev.items, emptyItem()],
                  }))
                }
              >
                <Plus className="h-4 w-4" aria-hidden />
                Adicionar
              </Button>
            </div>

            {form.items.map((item, index) => (
              <div
                key={index}
                className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    onChange={(e) => selectProduct(index, e.target.value)}
                    aria-label={`Item ${index + 1}`}
                    className="flex-1"
                  >
                    <option value="" disabled>
                      Selecione o item…
                    </option>
                    {selectableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — {brl(product.price)}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index),
                      }))
                    }
                    disabled={form.items.length === 1}
                    aria-label={`Remover item ${index + 1}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Qtd." htmlFor={`item-qty-${index}`}>
                    <Input
                      id={`item-qty-${index}`}
                      value={item.qty}
                      onChange={(e) => setItem(index, { qty: e.target.value })}
                      inputMode="numeric"
                      className="h-10"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Preço unit. (R$)" htmlFor={`item-price-${index}`}>
                    <Input
                      id={`item-price-${index}`}
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItem(index, { unitPrice: e.target.value })
                      }
                      inputMode="decimal"
                      className="h-10"
                      autoComplete="off"
                    />
                  </Field>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-base font-semibold">{brl(formTotal)}</span>
            </div>

            {!hasProducts ? (
              <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400">
                Nenhum produto ativo cadastrado — cadastre itens na aba Produtos
                para incluí-los nos pedidos.
              </p>
            ) : null}
          </div>

          <Field label="Observações" htmlFor="order-notes">
            <Textarea
              id="order-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detalhes do pedido, forma de pagamento…"
            />
          </Field>

          {formError ? (
            <p
              className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
        </form>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Excluir pedido"
        description="Esta ação não pode ser desfeita e o pedido sairá do faturamento."
      />
    </div>
  );
}
