"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  SearchX,
  Trash2,
} from "lucide-react";
import { useProducts } from "@/lib/hooks";
import { deleteProduct, saveProduct } from "@/lib/db";
import type { Product, ProductInput } from "@/lib/types";
import { brl, parseDecimal, toEditableDecimal } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { RowIconButton } from "./clients-view";
import { cn } from "@/lib/utils";

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  stock: string;
  active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "",
  price: "",
  stock: "0",
  active: true,
};

/** Categorias já usadas, para sugerir no datalist do formulário */
function categoriesOf(products: Product[] | null): string[] {
  return [...new Set((products ?? []).map((p) => p.category).filter(Boolean))];
}

export function ProductsView() {
  const { products, loading } = useProducts();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    price?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products ?? [];
    return (products ?? []).filter((p) =>
      [p.name, p.category].join(" ").toLowerCase().includes(term)
    );
  }, [products, search]);

  const categories = useMemo(() => categoriesOf(products), [products]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price: toEditableDecimal(product.price),
      stock: String(product.stock),
      active: product.active,
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "Informe o nome.";
    const price = parseDecimal(form.price);
    if (!form.price.trim() || price < 0)
      errors.price = "Informe um preço válido.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const stock = Math.max(0, Math.floor(Number(form.stock) || 0));

    setSaving(true);
    try {
      const input: ProductInput = {
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        stock,
        active: form.active,
      };
      await saveProduct(input, editing?.id);
      setDialogOpen(false);
    } catch (error) {
      console.error("[produtos] erro ao salvar:", error);
      setFormErrors({ name: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("[produtos] erro ao excluir:", error);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Carregando…"
              : `${products?.length ?? 0} ${
                  products?.length === 1
                    ? "item cadastrado"
                    : "itens cadastrados"
                }`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo produto
        </Button>
      </header>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou categoria…"
        inputMode="search"
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search.trim() ? SearchX : Package}
          title={
            search.trim()
              ? "Nenhum item encontrado"
              : "Nenhum produto cadastrado"
          }
          description={
            search.trim()
              ? "Tente outro termo de busca ou cadastre um novo item."
              : "Cadastre serviços, produtos ou pacotes para usar nos pedidos."
          }
          action={
            search.trim() ? null : (
              <Button onClick={openNew} size="sm" className="mt-1">
                <Plus className="h-4 w-4" aria-hidden />
                Cadastrar produto
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
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Categoria</th>
                    <th className="px-5 py-3 font-medium">Preço</th>
                    <th className="px-5 py-3 font-medium">Estoque</th>
                    <th className="px-5 py-3 font-medium">Situação</th>
                    <th className="px-5 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-accent/40"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        {product.name}
                      </td>
                      <td className="px-5 py-3.5">
                        {product.category ? (
                          <Badge variant="neutral">{product.category}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold">
                        {brl(product.price)}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {product.stock > 0 ? `${product.stock} un.` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {product.active ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="neutral">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <RowIconButton
                            label={`Editar ${product.name}`}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowIconButton>
                          <RowIconButton
                            label={`Excluir ${product.name}`}
                            danger
                            onClick={() => setDeletingId(product.id)}
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
            {filtered.map((product) => (
              <li
                key={product.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {product.category ? (
                        <Badge variant="neutral">{product.category}</Badge>
                      ) : null}
                      {product.active ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="neutral">Inativo</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <RowIconButton
                      label={`Editar ${product.name}`}
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </RowIconButton>
                    <RowIconButton
                      label={`Excluir ${product.name}`}
                      danger
                      onClick={() => setDeletingId(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowIconButton>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {product.stock > 0
                      ? `Estoque: ${product.stock} un.`
                      : "Sem controle de estoque"}
                  </span>
                  <span className="text-sm font-semibold">
                    {brl(product.price)}
                  </span>
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
        title={editing ? "Editar produto" : "Novo produto"}
        description={
          editing
            ? "Atualize os dados e salve."
            : "Cadastre um serviço, produto ou pacote."
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
            <Button type="submit" form="product-form" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {editing ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Nome"
            htmlFor="product-name"
            error={formErrors.name}
          >
            <Input
              id="product-name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (formErrors.name)
                  setFormErrors({ ...formErrors, name: undefined });
              }}
              placeholder="Ex.: Serviço premium"
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label="Categoria" htmlFor="product-category" hint="Opcional — agrupa itens semelhantes.">
            <Input
              id="product-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex.: Serviços, Produtos…"
              list="product-categories"
              autoComplete="off"
            />
            <datalist id="product-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Preço (R$)"
              htmlFor="product-price"
              error={formErrors.price}
            >
              <Input
                id="product-price"
                value={form.price}
                onChange={(e) => {
                  setForm({ ...form, price: e.target.value });
                  if (formErrors.price)
                    setFormErrors({ ...formErrors, price: undefined });
                }}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Estoque"
              htmlFor="product-stock"
              hint="0 = sem controle"
            >
              <Input
                id="product-stock"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: e.target.value })
                }
                placeholder="0"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
          </div>

          {/* Interruptor de produto ativo */}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span>
              <span className="block text-sm font-medium">
                Produto ativo
              </span>
              <span className="block text-xs text-muted-foreground">
                Itens inativos ficam ocultos ao criar pedidos.
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
              />
              <span
                className={cn(
                  "h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5",
                  "block"
                )}
              />
            </span>
          </label>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Excluir produto"
        description="Esta ação não pode ser desfeita. Pedidos já registrados manterão o nome do item."
      />
    </div>
  );
}
