"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  SearchX,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useClients } from "@/lib/hooks";
import { deleteClient, saveClient } from "@/lib/db";
import type { Client, ClientInput } from "@/lib/types";
import { formatEpochDate, phoneMask } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EMPTY_FORM: ClientInput = {
  name: "",
  phone: "",
  email: "",
  city: "",
  notes: "",
};

export function ClientsView() {
  const { clients, loading } = useClients();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInput>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients ?? [];
    return (clients ?? []).filter((c) =>
      [c.name, c.email, c.phone, c.city]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [clients, search]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNameError(null);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      city: client.city,
      notes: client.notes,
    });
    setNameError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setNameError("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      await saveClient(
        { ...form, name: form.name.trim(), email: form.email.trim() },
        editing?.id
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("[clientes] erro ao salvar:", error);
      setNameError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteClient(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("[clientes] erro ao excluir:", error);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Carregando…"
              : `${clients?.length ?? 0} ${
                  clients?.length === 1
                    ? "cliente cadastrado"
                    : "clientes cadastrados"
                }`}
          </p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4" aria-hidden />
          Novo cliente
        </Button>
      </header>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, e-mail, telefone ou cidade…"
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
          icon={search.trim() ? SearchX : Users}
          title={
            search.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"
          }
          description={
            search.trim()
              ? "Tente outro termo de busca ou cadastre um novo cliente."
              : "Cadastre seus clientes para vincular aos pedidos."
          }
          action={
            search.trim() ? null : (
              <Button onClick={openNew} size="sm" className="mt-1">
                <UserPlus className="h-4 w-4" aria-hidden />
                Cadastrar cliente
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
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Telefone</th>
                    <th className="px-5 py-3 font-medium">Cidade</th>
                    <th className="px-5 py-3 font-medium">Cliente desde</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-accent/40"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.email || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {client.phone || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {client.city || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatEpochDate(client.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <RowIconButton
                            label={`Editar ${client.name}`}
                            onClick={() => openEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowIconButton>
                          <RowIconButton
                            label={`Excluir ${client.name}`}
                            danger
                            onClick={() => setDeletingId(client.id)}
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
            {filtered.map((client) => (
              <li
                key={client.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{client.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {client.city || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <RowIconButton
                      label={`Editar ${client.name}`}
                      onClick={() => openEdit(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </RowIconButton>
                    <RowIconButton
                      label={`Excluir ${client.name}`}
                      danger
                      onClick={() => setDeletingId(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowIconButton>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {client.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" aria-hidden />
                      {client.phone}
                    </span>
                  ) : null}
                  {client.email ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{client.email}</span>
                    </span>
                  ) : null}
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
        title={editing ? "Editar cliente" : "Novo cliente"}
        description={
          editing
            ? "Atualize os dados e salve."
            : "Preencha os dados do cliente."
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
            <Button type="submit" form="client-form" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Nome completo"
            htmlFor="client-name"
            error={nameError ?? undefined}
          >
            <Input
              id="client-name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (nameError) setNameError(null);
              }}
              placeholder="Ex.: Maria da Silva"
              autoComplete="off"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Telefone" htmlFor="client-phone">
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: phoneMask(e.target.value) })
                }
                placeholder="(11) 99999-9999"
                inputMode="tel"
                autoComplete="off"
              />
            </Field>
            <Field label="Cidade" htmlFor="client-city">
              <Input
                id="client-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ex.: Guarulhos"
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="E-mail" htmlFor="client-email">
            <Input
              id="client-email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="cliente@email.com"
              autoComplete="off"
            />
          </Field>

          <Field label="Observações" htmlFor="client-notes">
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferências, histórico…"
            />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Excluir cliente"
        description="Esta ação não pode ser desfeita. Os pedidos já registrados serão mantidos."
      />
    </div>
  );
}

/** Botão de ícone para ações em linhas/itens de lista */
export function RowIconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
