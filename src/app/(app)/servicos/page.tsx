"use client";

import { useMemo, useState } from "react";
import { Clock3, Pencil, Plus, Search, Wrench, Boxes, Trash2 } from "lucide-react";
import {
  Card,
  Label,
  Badge,
  EmptyState,
  Field,
  Modal,
  SearchInput,
  Segmented,
  DangerButton,
  PageHead,
  AddButton,
  useConfirm,
} from "@/components/ui";
import { useStore, type Row } from "@/lib/store";
import { brl, num } from "@/lib/format";

type Draft = {
  id?: number;
  name: string;
  description: string;
  categoryId: number | null;
  priceEco: number;
  priceMed: number;
  pricePrem: number;
  durationMinutes: number;
  materials: string;
  active: boolean;
};

const empty: Draft = {
  name: "",
  description: "",
  categoryId: null,
  priceEco: 0,
  priceMed: 0,
  pricePrem: 0,
  durationMinutes: 60,
  materials: "",
  active: true,
};

export default function ServicosPage() {
  const { data, mutate, notify } = useStore();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [faixa, setFaixa] = useState<"eco" | "med" | "prem">("med");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catDraft, setCatDraft] = useState<{ id?: number; name: string; color: string; icon: string } | null>(null);

  const categories = data.categories || [];
  const services = data.services || [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s: any) => {
      const okCat = cat === "all" || s.categoryId === cat;
      const okTerm =
        !term ||
        (s.name + " " + (s.description || "") + " " + (s.materials || "")).toLowerCase().includes(term);
      return okCat && okTerm;
    });
  }, [services, q, cat]);

  const grouped = useMemo(
    () =>
      categories
        .map((c: any) => ({ cat: c, items: filtered.filter((s: any) => s.categoryId === c.id) }))
        .filter((g) => g.items.length > 0),
    [categories, filtered],
  );

  const save = async () => {
    if (!draft?.name.trim()) return;
    const payload = { ...draft, name: draft.name.trim() };
    if (draft.id) {
      await mutate({ table: "services", op: "update", id: draft.id, data: payload });
      notify("Serviço atualizado.", "green");
    } else {
      await mutate({ table: "services", op: "create", data: payload });
      notify("Serviço adicionado à tabela.", "green");
    }
    setDraft(null);
  };

  const remove = async (s: Row) => {
    if (await confirm(`Excluir o serviço “${s.name}”?`)) {
      await mutate({ table: "services", op: "delete", id: s.id });
      notify("Serviço excluído.", "amber");
    }
  };

  const priceLabel = faixa === "eco" ? "priceEco" : faixa === "med" ? "priceMed" : "pricePrem";

  return (
    <div>
      <PageHead
        eyebrow="Tabela de preços"
        title="Serviços"
        subtitle="Sua tabela comercial por categoria, com três faixas de preço, tempo médio de execução e materiais sugeridos."
        actions={
          <>
            <button className="btn" type="button" onClick={() => setCatDraft({ name: "", color: "#0A84FF", icon: "wrench" })}>
              <Plus size={15} /> Categoria
            </button>
            <AddButton onClick={() => setDraft({ ...empty, categoryId: categories[0]?.id ?? null })}>Novo serviço</AddButton>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-md flex-1">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por nome, descrição ou material…" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn h-9 px-4 text-[13px]"
            style={cat === "all" ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
            onClick={() => setCat("all")}
          >
            Todas ({services.length})
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              className="btn h-9 px-4 text-[13px]"
              style={cat === c.id ? { background: "var(--accentSoft)", color: "var(--accent)", borderColor: "transparent" } : undefined}
              onClick={() => setCat(c.id)}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
        <div className="lg:ml-auto">
          <Segmented
            value={faixa}
            onChange={setFaixa}
            options={[
              { value: "eco", label: "Econômico" },
              { value: "med", label: "Médio" },
              { value: "prem", label: "Premium" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={26} />}
            title="Nenhum serviço encontrado"
            hint={q ? `Nada corresponde a “${q}”. Ajuste a busca ou crie um novo serviço.` : "Comece adicionando o primeiro serviço da sua tabela."}
            action={<AddButton onClick={() => setDraft({ ...empty, categoryId: categories[0]?.id ?? null })}>Novo serviço</AddButton>}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ cat: c, items }, gi) => (
            <Card key={c.id} className="overflow-hidden rise" style={{ animationDelay: `${gi * 50}ms` } as any}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${c.color}22`, color: c.color }}>
                    <Wrench size={15} />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">{c.name}</p>
                    <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{items.length} serviço(s)</p>
                  </div>
                </div>
                <button
                  className="btn btn-ghost h-8 px-3 text-[13px]"
                  type="button"
                  onClick={() => setCatDraft({ id: c.id, name: c.name, color: c.color, icon: c.icon })}
                >
                  <Pencil size={13} /> Editar
                </button>
              </div>

              <div className="hidden grid-cols-12 gap-3 px-5 py-2.5 md:grid" style={{ borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }}>
                <span className="label col-span-4">Serviço</span>
                <span className="label col-span-2 text-right">Econômico</span>
                <span className="label col-span-2 text-right">Médio</span>
                <span className="label col-span-2 text-right">Premium</span>
                <span className="label col-span-2 text-right">Tempo</span>
              </div>

              {items.map((s: any) => (
                <div
                  key={s.id}
                  className="grid grid-cols-2 gap-3 px-5 py-3.5 transition md:grid-cols-12 md:items-center"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div className="col-span-2 md:col-span-4">
                    <p className="text-[14.5px] font-medium">{s.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[12.5px]" style={{ color: "var(--text-2)" }}>
                      {s.description}
                    </p>
                    {s.materials && (
                      <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>
                        <Boxes size={12} /> {s.materials}
                      </p>
                    )}
                  </div>
                  <div className="text-right md:col-span-2">
                    <span className="label md:hidden">Econ.</span>
                    <p className="tnum text-[14.5px]" style={{ color: faixa === "eco" ? "var(--accent)" : "var(--text-2)" }}>
                      {brl(s.priceEco)}
                    </p>
                  </div>
                  <div className="text-right md:col-span-2">
                    <span className="label md:hidden">Médio</span>
                    <p className="tnum text-[14.5px] font-medium" style={{ color: faixa === "med" ? "var(--accent)" : "var(--text-2)" }}>
                      {brl(s.priceMed)}
                    </p>
                  </div>
                  <div className="text-right md:col-span-2">
                    <span className="label md:hidden">Premium</span>
                    <p className="tnum text-[14.5px]" style={{ color: faixa === "prem" ? "var(--accent)" : "var(--text-2)" }}>
                      {brl(s.pricePrem)}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--text-2)" }}>
                      <Clock3 size={13} />
                      <span className="tnum">{num((s.durationMinutes || 0) / 60, 1)}h</span>
                      <span className="tnum font-semibold" style={{ color: "var(--text)" }}>
                        {brl(s[priceLabel])}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <button className="btn btn-ghost h-8 w-8 rounded-full p-0" type="button" aria-label="Editar serviço" onClick={() => setDraft({ ...s })}>
                        <Pencil size={14} />
                      </button>
                      <DangerButton onConfirm={() => remove(s)} />
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* editor de serviço */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar serviço" : "Novo serviço"}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={save}>Salvar</button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4">
            <Field label="Nome">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Instalação de tomada 2P+T" autoFocus />
            </Field>
            <Field label="Descrição">
              <textarea className="textarea" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="O que está incluso no serviço…" />
            </Field>
            <Field label="Categoria">
              <select className="select" value={draft.categoryId ?? ""} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sem categoria</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Preço econômico">
                <input className="input tnum" type="number" value={draft.priceEco} onChange={(e) => setDraft({ ...draft, priceEco: Number(e.target.value) })} />
              </Field>
              <Field label="Preço médio">
                <input className="input tnum" type="number" value={draft.priceMed} onChange={(e) => setDraft({ ...draft, priceMed: Number(e.target.value) })} />
              </Field>
              <Field label="Preço premium">
                <input className="input tnum" type="number" value={draft.pricePrem} onChange={(e) => setDraft({ ...draft, pricePrem: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tempo médio (minutos)">
                <input className="input tnum" type="number" value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} />
              </Field>
              <Field label="Materiais sugeridos" hint="Separados por vírgula">
                <input className="input" value={draft.materials} onChange={(e) => setDraft({ ...draft, materials: e.target.value })} placeholder="Cabo CAT6, conectores, POF" />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-[14px]">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              Serviço ativo na tabela
            </label>
          </div>
        )}
      </Modal>

      {/* editor de categoria */}
      <Modal
        open={!!catDraft}
        onClose={() => setCatDraft(null)}
        title={catDraft?.id ? "Editar categoria" : "Nova categoria"}
        footer={
          <>
            <button className="btn" type="button" onClick={() => setCatDraft(null)}>Cancelar</button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                if (!catDraft?.name.trim()) return;
                if (catDraft.id) {
                  await mutate({ table: "categories", op: "update", id: catDraft.id, data: { name: catDraft.name, color: catDraft.color, icon: catDraft.icon } });
                } else {
                  await mutate({ table: "categories", op: "create", data: { name: catDraft.name, color: catDraft.color, icon: catDraft.icon } });
                }
                notify("Categoria salva.", "green");
                setCatDraft(null);
              }}
            >
              Salvar
            </button>
          </>
        }
      >
        {catDraft && (
          <div className="grid gap-4">
            <Field label="Nome">
              <input className="input" value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} placeholder="Ex.: Hidráulica" autoFocus />
            </Field>
            <Field label="Cor de identificação">
              <div className="flex flex-wrap gap-2">
                {["#0A84FF", "#FF9F0A", "#30D158", "#BF5AF2", "#FF453A", "#64D2FF"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setCatDraft({ ...catDraft, color: c })}
                    className="h-8 w-8 rounded-full transition"
                    style={{ background: c, outline: catDraft.color === c ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
                  />
                ))}
              </div>
            </Field>
            <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "var(--bg)" }}>
              <Badge tone="grey">Prévia</Badge>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${catDraft.color}22`, color: catDraft.color }}>
                <Wrench size={15} />
              </span>
              <span className="text-[14.5px] font-medium">{catDraft.name || "Nome da categoria"}</span>
            </div>
            {catDraft.id && (
              <div className="pt-2">
                <DangerButton
                  label="Excluir categoria"
                  onConfirm={async () => {
                    await mutate({ table: "categories", op: "delete", id: catDraft.id });
                    notify("Categoria excluída.", "amber");
                    setCatDraft(null);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
