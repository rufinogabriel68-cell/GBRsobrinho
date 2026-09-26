"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock3, MapPin } from "lucide-react";
import { AddButton, Card, EmptyState, Field, Label, Modal, PageHead, Segmented } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDate, fmtTime, isoDay, uid } from "@/lib/format";

type View = "dia" | "semana" | "mes";
const COLORS = ["#0A84FF", "#30D158", "#FF9F0A", "#BF5AF2", "#FF453A", "#64D2FF"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h às 20h

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function AgendaPage() {
  const { data, mutate, notify } = useStore();
  const [view, setView] = useState<View>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [draft, setDraft] = useState<any | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const events = data.events || [];
  const clients = data.clients || [];

  const shift = (dir: number) => {
    const d = new Date(cursor);
    if (view === "dia") d.setDate(d.getDate() + dir);
    else if (view === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const title = useMemo(() => {
    if (view === "dia") return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (view === "semana") {
      const s = startOfWeek(cursor);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [view, cursor]);

  const forDay = (day: Date) =>
    events
      .filter((e: any) => isoDay(e.startAt) === isoDay(day))
      .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, [cursor]);

  const newEvent = (start: Date) => {
    const end = new Date(start.getTime() + 3600000);
    setDraft({
      title: "",
      startAt: toLocal(start),
      endAt: toLocal(end),
      color: COLORS[0],
      location: "",
      notes: "",
      clientId: null,
      allDay: false,
    });
  };

  const save = async () => {
    if (!draft?.title.trim()) return notify("Dê um título para o compromisso.", "amber");
    const payload = { ...draft, startAt: new Date(draft.startAt).toISOString(), endAt: new Date(draft.endAt).toISOString() };
    if (draft.id) await mutate({ table: "events", op: "update", id: draft.id, data: payload });
    else await mutate({ table: "events", op: "create", data: payload });
    notify("Compromisso salvo. Lembrete enviado.", "green");
    setDraft(null);
  };

  const dropOn = async (day: Date) => {
    if (dragId == null) return;
    const ev = events.find((e: any) => e.id === dragId);
    if (!ev) return;
    const prev = new Date(ev.startAt);
    const next = new Date(day);
    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    await mutate({ table: "events", op: "update", id: ev.id, data: { startAt: next.toISOString(), endAt: new Date(new Date(ev.endAt).getTime() + (next.getTime() - prev.getTime())).toISOString() } });
    setDragId(null);
    notify(`“${ev.title}” movido para ${fmtDate(next)}.`, "blue");
  };

  const todayIso = isoDay(new Date());

  return (
    <div>
      <PageHead
        eyebrow="Tempo"
        title="Agenda"
        subtitle="Visões de dia, semana e mês com arrastar e soltar. Os compromissos viram lembrete no celular."
        actions={<AddButton onClick={() => newEvent(new Date())}>Novo compromisso</AddButton>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn h-9 w-9 rounded-full p-0" type="button" aria-label="Anterior" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn h-9 px-4 text-[13px]" type="button" onClick={() => setCursor(new Date())}>Hoje</button>
          <button className="btn h-9 w-9 rounded-full p-0" type="button" aria-label="Próximo" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <h2 className="text-[17px] font-semibold capitalize" style={{ letterSpacing: "-0.02em" }}>{title}</h2>
        <div className="lg:ml-auto">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "dia", label: "Dia" },
              { value: "semana", label: "Semana" },
              { value: "mes", label: "Mês" },
            ]}
          />
        </div>
      </div>

      {/* ---------------- mês ---------------- */}
      {view === "mes" && (
        <Card className="overflow-hidden rise">
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--line)" }}>
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="label px-2 py-3 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((day) => {
              const isCurrent = day.getMonth() === cursor.getMonth();
              const isToday = isoDay(day) === todayIso;
              const list = forDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(day)}
                  onClick={() => newEvent(day)}
                  className="min-h-[104px] cursor-pointer p-2 transition"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    background: isToday ? "var(--accentSoft)" : isCurrent ? "transparent" : "var(--bg)",
                    opacity: isCurrent ? 1 : 0.5,
                  }}
                >
                  <span
                    className="mono inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
                    style={{ background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#fff" : "var(--text-2)" }}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {list.slice(0, 3).map((e: any) => (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={() => setDragId(e.id)}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDraft({ ...e, startAt: toLocal(new Date(e.startAt)), endAt: toLocal(new Date(e.endAt)) });
                        }}
                        className="truncate rounded-md px-1.5 py-1 text-[11px] font-medium"
                        style={{ background: `${e.color}26`, color: e.color, borderLeft: `3px solid ${e.color}` }}
                        title={`${fmtTime(e.startAt)} ${e.title}`}
                      >
                        {fmtTime(e.startAt)} {e.title}
                      </div>
                    ))}
                    {list.length > 3 && <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>+{list.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---------------- semana ---------------- */}
      {view === "semana" && (
        <Card className="overflow-x-auto rise">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-8" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="label px-2 py-3" />
              {weekDays.map((d) => (
                <div key={d.toISOString()} className="px-2 py-3 text-center">
                  <p className="label">{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</p>
                  <p className="tnum mt-1 text-[15px] font-semibold" style={{ color: isoDay(d) === todayIso ? "var(--accent)" : "var(--text)" }}>
                    {d.getDate()}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative grid grid-cols-8">
              <div>
                {HOURS.map((h) => (
                  <div key={h} className="h-14 pr-2 text-right" style={{ borderBottom: "1px solid var(--line)" }}>
                    <span className="mono text-[11px]" style={{ color: "var(--text-3)" }}>{String(h).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="relative"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(day)}
                  onClick={() => newEvent(day)}
                >
                  {HOURS.map((h) => (
                    <div key={h} className="h-14" style={{ borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)" }} />
                  ))}
                  {forDay(day).map((e: any) => {
                    const start = new Date(e.startAt);
                    const end = new Date(e.endAt);
                    const top = ((start.getHours() - HOURS[0]) * 60 + start.getMinutes()) * (56 / 60);
                    const height = Math.max(28, ((end.getTime() - start.getTime()) / 3600000) * 56);
                    return (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={() => setDragId(e.id)}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDraft({ ...e, startAt: toLocal(start), endAt: toLocal(end) });
                        }}
                        className="absolute left-1 right-1 cursor-grab overflow-hidden rounded-lg px-2 py-1 text-[11.5px] font-medium leading-tight transition hover:opacity-80"
                        style={{ top, height, background: `${e.color}26`, borderLeft: `3px solid ${e.color}`, color: e.color }}
                      >
                        <span className="mono block text-[10.5px] opacity-80">{fmtTime(e.startAt)}</span>
                        <span className="line-clamp-2">{e.title}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- dia ---------------- */}
      {view === "dia" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rise lg:col-span-2">
            {forDay(cursor).length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={26} />}
                title="Dia livre"
                hint="Nenhum compromisso para hoje. Toque em um horário para criar um novo."
                action={<AddButton onClick={() => newEvent(new Date())}>Marcar compromisso</AddButton>}
              />
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {forDay(cursor).map((e: any) => {
                  const client = clients.find((c: any) => c.id === e.clientId);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className="flex w-full items-start gap-4 px-6 py-4 text-left transition"
                      style={{ borderLeft: `4px solid ${e.color}` }}
                      onClick={() => setDraft({ ...e, startAt: toLocal(new Date(e.startAt)), endAt: toLocal(new Date(e.endAt)) })}
                    >
                      <div className="w-16 shrink-0 text-right">
                        <p className="tnum text-[14px] font-semibold">{fmtTime(e.startAt)}</p>
                        <p className="tnum text-[12px]" style={{ color: "var(--text-3)" }}>{fmtTime(e.endAt)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium">{e.title}</p>
                        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                          {client?.name || "Sem cliente"}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                        {e.notes && <p className="mt-1 text-[12.5px]" style={{ color: "var(--text-3)" }}>{e.notes}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 rise" style={{ animationDelay: "60ms" }}>
            <Label>Próximos 7 dias</Label>
            <div className="mt-4 flex flex-col gap-3">
              {events
                .filter((e: any) => {
                  const t = new Date(e.startAt).getTime();
                  return t >= Date.now() && t <= Date.now() + 7 * 86400000;
                })
                .sort((a: any, b: any) => +new Date(a.startAt) - +new Date(b.startAt))
                .map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{e.title}</p>
                      <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                        {fmtDate(e.startAt, { weekday: "short", day: "2-digit", month: "short" })} · {fmtTime(e.startAt)}
                      </p>
                    </div>
                  </div>
                ))}
              {!events.length && <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>Agenda vazia.</p>}
            </div>
          </Card>
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
        <Clock3 size={13} /> Arraste um compromisso para outro dia para reagendar · clique em um espaço vazio para criar
      </p>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar compromisso" : "Novo compromisso"}
        footer={
          <>
            {draft?.id && (
              <button
                className="btn btn-danger"
                type="button"
                onClick={async () => {
                  await mutate({ table: "events", op: "delete", id: draft.id });
                  notify("Compromisso removido.", "amber");
                  setDraft(null);
                }}
              >
                Excluir
              </button>
            )}
            <button className="btn" type="button" onClick={() => setDraft(null)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={save}>Salvar</button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4">
            <Field label="Título">
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Visita técnica" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Início">
                <input className="input" type="datetime-local" value={draft.startAt} onChange={(e) => setDraft({ ...draft, startAt: e.target.value })} />
              </Field>
              <Field label="Fim">
                <input className="input" type="datetime-local" value={draft.endAt} onChange={(e) => setDraft({ ...draft, endAt: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente">
                <select className="select" value={draft.clientId ?? ""} onChange={(e) => setDraft({ ...draft, clientId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Sem cliente</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Local">
                <input className="input" value={draft.location || ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Endereço ou referência" />
              </Field>
            </div>
            <Field label="Cor">
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className="h-8 w-8 rounded-full transition"
                    style={{ background: c, outline: draft.color === c ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Observações">
              <textarea className="textarea" rows={3} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Levar escada, material…" />
            </Field>
            <p className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--text-3)" }}>
              <MapPin size={13} /> O lembrete é enviado 1 hora antes do início.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function toLocal(d: Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}T${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}
