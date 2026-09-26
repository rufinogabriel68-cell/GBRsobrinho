"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Pin, Plus, Search, Trash2, Folder } from "lucide-react";
import { AddButton, Card, DangerButton, EmptyState, Field, Label, Modal, PageHead, SearchInput } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/format";

type Draft = any;

export default function AnotacoesPage() {
  const { data, mutate, notify } = useStore();
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("todas");
  const [selected, setSelected] = useState<number | null>(null);
  const [folderModal, setFolderModal] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [searching, setSearching] = useState(false);

  const notes = data.notes || [];

  const folders = useMemo(() => [...new Set(notes.map((n: any) => n.folder || "Geral"))], [notes]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return notes
      .filter((n: any) => folder === "todas" || (n.folder || "Geral") === folder)
      .filter((n: any) => !term || `${n.title} ${n.body || ""} ${(n.tags || []).join(" ")}`.toLowerCase().includes(term))
      .sort((a: any, b: any) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [notes, folder, q]);

  const active = notes.find((n: any) => n.id === selected) || null;

  const create = async () => {
    const row: any = await mutate({
      table: "notes",
      op: "create",
      data: {
        title: "Nova anotação",
        body: "",
        folder: folder === "todas" ? folders[0] || "Geral" : folder,
        tags: [],
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    });
    setSelected(row?.id ?? null);
  };

  const update = async (patch: any) => {
    if (!active) return;
    await mutate({ table: "notes", op: "update", id: active.id, data: { ...patch, updatedAt: new Date().toISOString() } });
  };

  return (
    <div>
      <PageHead
        eyebrow="Caderno"
        title="Anotações"
        subtitle="Tudo que você não quer esquecer: checklists de ferramenta, preços, particularidades de cada cliente."
        actions={
          <>
            <button className="btn" type="button" onClick={() => setFolderModal(true)}>
              <Folder size={15} /> Nova pasta
            </button>
            <AddButton onClick={create}>Nova anotação</AddButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* pastas */}
        <Card className="hidden h-fit p-3 lg:col-span-2 rise">
          <Label className="px-2 py-2">Pastas</Label>
          {["todas", ...folders].map((f) => (
            <button
              key={f}
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13.5px] transition"
              style={{ background: folder === f ? "var(--accentSoft)" : "transparent", color: folder === f ? "var(--accent)" : "var(--text)" }}
              onClick={() => setFolder(f)}
            >
              <span className="truncate">{f === "todas" ? "Todas as notas" : f}</span>
              <span className="tnum text-[12px]" style={{ color: "var(--text-3)" }}>
                {f === "todas" ? notes.length : notes.filter((n: any) => (n.folder || "Geral") === f).length}
              </span>
            </button>
          ))}
        </Card>

        {/* lista */}
        <div className="lg:col-span-4">
          <div className="mb-3 flex gap-2">
            <div className="flex-1">
              <SearchInput value={q} onChange={setQ} placeholder="Buscar nas notas…" />
            </div>
            <button className="btn h-10 w-10 rounded-full p-0 lg:hidden" type="button" aria-label="Filtrar pasta" onClick={() => setFolderModal(true)}>
              <Folder size={16} />
            </button>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<NotebookPen size={26} />}
                title="Nenhuma anotação"
                hint="Crie a primeira nota: um checklist de saída, o preço de um serviço ou o jeito de atender um cliente."
                action={<AddButton onClick={create}>Nova anotação</AddButton>}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {filtered.map((n: any) => (
                <button
                  key={n.id}
                  type="button"
                  className="block w-full px-4 py-3.5 text-left transition"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    background: selected === n.id ? "var(--accentSoft)" : "transparent",
                  }}
                  onClick={() => setSelected(n.id)}
                >
                  <div className="flex items-center gap-2">
                    {n.pinned && <Pin size={12} style={{ color: "var(--amber)" }} />}
                    <span className="truncate text-[14.5px] font-medium">{n.title}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {n.body || "Sem conteúdo"}
                  </p>
                  <p className="mt-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                    {(n.folder || "Geral")} · {fmtDateTime(n.updatedAt)}
                  </p>
                </button>
              ))}
            </Card>
          )}
        </div>

        {/* editor */}
        <div className="lg:col-span-6">
          {!active ? (
            <Card className="rise">
              <EmptyState
                icon={<Search size={26} />}
                title="Selecione uma anotação"
                hint="O editor abre aqui. Tudo é salvo automaticamente enquanto você escreve — funciona offline."
                action={<AddButton onClick={create}>Nova anotação</AddButton>}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden rise">
              <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <select
                  className="select h-8 w-auto px-2 text-[13px]"
                  value={active.folder || "Geral"}
                  onChange={(e) => update({ folder: e.target.value })}
                  aria-label="Pasta"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  className="btn h-8 px-3 text-[12.5px]"
                  type="button"
                  onClick={() => update({ pinned: !active.pinned })}
                  style={active.pinned ? { background: "var(--amber-soft)", color: "var(--amber)", borderColor: "transparent" } : undefined}
                >
                  <Pin size={13} /> {active.pinned ? "Fixada" : "Fixar"}
                </button>
                <span className="ml-auto text-[12px]" style={{ color: "var(--text-3)" }}>salvo {fmtDateTime(active.updatedAt)}</span>
                <DangerButton
                  onConfirm={async () => {
                    await mutate({ table: "notes", op: "delete", id: active.id });
                    notify("Anotação excluída.", "amber");
                    setSelected(null);
                  }}
                />
              </div>

              <input
                className="w-full bg-transparent px-6 pt-6 text-[26px] font-semibold outline-none"
                style={{ letterSpacing: "-0.03em", color: "var(--text)" }}
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                aria-label="Título da anotação"
              />
              <textarea
                className="min-h-[340px] w-full resize-none bg-transparent px-6 py-4 text-[15px] leading-[1.7] outline-none"
                style={{ color: "var(--text-2)" }}
                value={active.body || ""}
                onChange={(e) => update({ body: e.target.value })}
                placeholder="Comece a escrever…"
                aria-label="Conteúdo da anotação"
              />
              <div className="flex items-center gap-2 px-6 py-4" style={{ borderTop: "1px solid var(--line)" }}>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(active.tags || []).map((t: string) => (
                    <span key={t} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: "var(--grey-soft)", color: "var(--text-2)" }}>
                      {t}
                    </span>
                  ))}
                  <input
                    className="h-7 w-32 rounded-full px-3 text-[12px] outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
                    placeholder="+ tag"
                    onKeyDown={(e) => {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (e.key === "Enter" && v) {
                        update({ tags: [...new Set([...(active.tags || []), v])] });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    aria-label="Adicionar tag"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={folderModal}
        onClose={() => setFolderModal(false)}
        title="Pastas e filtros"
        footer={
          <>
            <button className="btn" type="button" onClick={() => setFolderModal(false)}>Fechar</button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                if (!newFolder.trim()) return;
                setFolder(newFolder.trim());
                setNewFolder("");
                setFolderModal(false);
                notify("Pasta criada. Use em uma nota para salvá-la.", "green");
              }}
            >
              Criar pasta
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nova pasta">
            <input className="input" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="Ex.: Obras em andamento" autoFocus />
          </Field>
          <div className="flex flex-wrap gap-2">
            {["todas", ...folders].map((f) => (
              <button
                key={f}
                type="button"
                className="btn h-9 px-4 text-[13px]"
                style={folder === f ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
                onClick={() => {
                  setFolder(f);
                  setFolderModal(false);
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
