"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Boxes,
  Calculator,
  CalendarDays,
  ClipboardList,
  Command,
  FileText,
  Gauge,
  Menu,
  Moon,
  NotebookPen,
  Search,
  Settings,
  Files,
  Sun,
  Users,
  Wallet,
  Wrench,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { cx, Toasts } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { brl, fmtDate, fmtDateTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Painel", icon: Gauge },
  { href: "/servicos", label: "Serviços", icon: Wrench },
  { href: "/calculadora", label: "Calc", icon: Calculator },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/os", label: "OS", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/anotacoes", label: "Notas", icon: NotebookPen },
  { href: "/documentos", label: "Docs", icon: Files },
  { href: "/config", label: "Ajustes", icon: Settings },
];

/* ------------------------------------------------------------------- rail */

function Rail({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed left-0 top-0 z-40 hidden h-full w-[78px] flex-col items-center gap-1 overflow-y-auto border-r py-4 md:flex"
      style={{ borderColor: "var(--line)", background: "var(--panel)" }}
      aria-label="Navegação principal"
    >
      <Link href="/" className="mb-3 flex items-center justify-center" aria-label="GBR Soluções">
        <BrandMark size={38} />
      </Link>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cx(
              "group relative flex w-[62px] flex-col items-center gap-1 rounded-2xl py-2.5 transition-all duration-200",
            )}
            style={{
              background: active ? "var(--accentSoft)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-2)",
            }}
            title={label}
          >
            <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
            <span className="text-[9.5px] font-medium tracking-tight">{label}</span>
            {active && (
              <span
                className="absolute -left-[9px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </Link>
        );
      })}

      <button
        className="btn btn-ghost mt-auto h-9 w-9 rounded-full p-0"
        onClick={onSearch}
        title="Buscar (⌘K)"
        aria-label="Abrir busca global"
        type="button"
      >
        <Search size={17} />
      </button>
    </nav>
  );
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="gbr-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E9BFF" />
          <stop offset="55%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#0057D8" />
        </linearGradient>
      </defs>
      <path
        d="M32 1.5C48.9 1.5 62.5 15.1 62.5 32S48.9 62.5 32 62.5 1.5 48.9 1.5 32 15.1 1.5 32 1.5Z"
        fill="url(#gbr-mark)"
      />
      <path
        d="M47 24A16 16 0 1 0 47 40L47 33.5 38 33.5"
        fill="none"
        stroke="#fff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="29" r="3.1" fill="#FF9F0A" />
    </svg>
  );
}

/* ----------------------------------------------------------------- topbar */

function SyncPill() {
  const { status, syncedAt, online, pendingCount, source, refresh } = useStore();
  const map = {
    loading: { text: "Sincronizando…", color: "var(--text-3)", icon: RefreshCw },
    synced: { text: syncedAt ? `Sincronizado ${new Date(syncedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Sincronizado", color: "var(--green)", icon: Cloud },
    pending: {
      text: pendingCount > 1 ? `${pendingCount} alterações pendentes` : "Enviando alterações…",
      color: "var(--amber)",
      icon: RefreshCw,
    },
    offline: { text: "Offline — dados em cache", color: "var(--amber)", icon: CloudOff },
    error: { text: "Sem conexão com o banco", color: "var(--red)", icon: CloudOff },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={() => void refresh()}
      className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition hover:opacity-80 sm:inline-flex"
      style={{ background: "var(--grey-soft)", color: s.color }}
      title="Forçar sincronização"
    >
      <Icon size={13} className={status === "loading" || status === "pending" ? "pulse-dot" : ""} />
      {s.text}
      {source === "demo" && (
        <span
          className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ background: "var(--amber-soft)", color: "var(--amber)" }}
          title="Modo demonstração: configure o Firebase para salvar seus dados."
        >
          demo
        </span>
      )}
      {!online && <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "var(--amber-soft)" }}>sem rede</span>}
    </button>
  );
}

function TopBar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { theme, resolved, cycle } = useTheme();
  // O ícone mostra como o painel está AGORA (o "auto" pode estar escuro).
  const ThemeIcon = resolved === "dark" ? Moon : Sun;
  const themeLabel = theme === "auto" ? "automático" : theme === "dark" ? "escuro" : "claro";
  const nextLabel = theme === "dark" ? "claro" : theme === "light" ? "automático" : "escuro";
  const SystemIcon = Cloud;
  return (
    <header
      className="glass sticky top-0 z-30 flex h-14 items-center gap-3 px-4 sm:px-7"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <button className="btn btn-ghost h-9 w-9 rounded-full p-0 md:hidden" onClick={onMenu} aria-label="Abrir menu" type="button">
        <Menu size={18} />
      </button>
      <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="Painel">
        <BrandMark size={26} />
      </Link>

      <div className="hidden items-center gap-2 md:flex">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
          GBR Soluções
        </span>
        <span style={{ color: "var(--text-3)" }}>/</span>
        <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
          seu sobrinho de aluguel
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SyncPill />
        <button
          type="button"
          onClick={onSearch}
          className="hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] transition sm:inline-flex"
          style={{ background: "var(--grey-soft)", color: "var(--text-2)" }}
        >
          <Search size={15} />
          Buscar
          <kbd className="mono rounded-md px-1.5 py-0.5 text-[11px]" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            ⌘K
          </kbd>
        </button>
        <button className="btn btn-ghost h-9 w-9 rounded-full p-0 sm:hidden" onClick={onSearch} aria-label="Buscar" type="button">
          <Search size={17} />
        </button>
        <button
          className="btn btn-ghost h-9 w-9 rounded-full p-0"
          onClick={cycle}
          aria-label={`Tema ${themeLabel}. Clique para usar o tema ${nextLabel}.`}
          title={`Tema ${themeLabel} — clique para usar o tema ${nextLabel}`}
          type="button"
        >
          <span className="relative flex items-center justify-center">
            <ThemeIcon size={17} />
            {theme === "auto" && (
              <SystemIcon
                size={9}
                className="absolute -bottom-1 -right-1 rounded-full"
                style={{ background: "var(--panel)" }}
              />
            )}
          </span>
        </button>
      </div>
    </header>
  );
}

/* -------------------------------------------------------- command palette */

type Cmd = {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href?: string;
  run?: () => void;
  meta?: string;
};

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const out: Cmd[] = [];
    NAV.forEach((n) =>
      out.push({ id: `p-${n.href}`, group: "Páginas", title: n.label, subtitle: `Ir para ${n.label}`, href: n.href }),
    );
    (data.clients || []).forEach((c: any) =>
      out.push({ id: `c-${c.id}`, group: "Clientes", title: c.name, subtitle: `${c.city || ""} ${c.phone || ""}`.trim(), href: "/clientes", meta: c.phone }),
    );
    (data.orders || []).forEach((o: any) =>
      out.push({ id: `o-${o.id}`, group: "Ordens de serviço", title: `${o.number} — ${o.title}`, subtitle: o.status.replace(/_/g, " "), href: "/os" }),
    );
    (data.quotes || []).forEach((q2: any) =>
      out.push({ id: `q-${q2.id}`, group: "Orçamentos", title: `${q2.number} — ${q2.title || "Sem título"}`, subtitle: brl(q2.total), href: "/orcamentos" }),
    );
    (data.services || []).forEach((s: any) =>
      out.push({ id: `s-${s.id}`, group: "Serviços", title: s.name, subtitle: brl(s.priceMed), href: "/servicos" }),
    );
    (data.notes || []).forEach((n: any) =>
      out.push({ id: `n-${n.id}`, group: "Anotações", title: n.title, subtitle: (n.body || "").slice(0, 70), href: "/anotacoes" }),
    );
    (data.events || []).forEach((e: any) =>
      out.push({ id: `e-${e.id}`, group: "Agenda", title: e.title, subtitle: fmtDateTime(e.startAt), href: "/agenda" }),
    );
    return out;
  }, [data]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? commands.filter((c) => (c.title + " " + c.subtitle + " " + c.group).toLowerCase().includes(term))
      : commands.filter((c) => c.group === "Páginas");
    return list.slice(0, 40);
  }, [q, commands]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setI((v) => Math.min(results.length - 1, v + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setI((v) => Math.max(0, v - 1));
      }
      if (e.key === "Enter") {
        const c = results[i];
        if (!c) return;
        onClose();
        if (c.href) router.push(c.href);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [results, i, onClose, router]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [i]);

  const active = results[i];

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/images/aurora.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(30px) saturate(130%)",
          transform: "scale(1.08)",
          opacity: 0.55,
        }}
        aria-hidden
      />
      <div className="fade absolute inset-0" style={{ background: "var(--scrim)", backdropFilter: "blur(18px)" }} onClick={onClose} />
      <div
        className="sheet-in relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[22px]"
        style={{ background: "var(--panel)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line-strong)" }}
        role="dialog"
        aria-label="Busca global"
      >
        <div className="flex items-center gap-3 px-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <Search size={18} style={{ color: "var(--text-3)" }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            placeholder="Buscar clientes, OS, orçamentos, serviços, notas…"
            className="h-14 w-full bg-transparent text-[16px] outline-none"
            style={{ color: "var(--text)" }}
            aria-label="Busca global"
          />
          <kbd className="mono hidden rounded-md px-2 py-1 text-[11px] sm:block" style={{ background: "var(--grey-soft)", color: "var(--text-2)" }}>
            esc
          </kbd>
        </div>

        <div className="flex min-h-0">
          <div ref={listRef} className="max-h-[52vh] min-h-[220px] flex-1 overflow-y-auto py-2">
            {results.length === 0 && (
              <div className="px-5 py-10 text-center text-[13.5px]" style={{ color: "var(--text-2)" }}>
                Nada encontrado para “{q}”.
                <br />
                <span style={{ color: "var(--text-3)" }}>Tente o nome do cliente, o número da OS ou o serviço.</span>
              </div>
            )}
            {results.map((c, idx) => (
              <div key={c.id}>
                {(idx === 0 || results[idx - 1].group !== c.group) && (
                  <div className="label px-5 pb-1.5 pt-3">{c.group}</div>
                )}
                <button
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setI(idx)}
                  onClick={() => {
                    onClose();
                    if (c.href) router.push(c.href);
                  }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition"
                  style={{ background: idx === i ? "var(--accentSoft)" : "transparent" }}
                >
                  <span className="flex-1 truncate text-[14px] font-medium">{c.title}</span>
                  <span className="hidden truncate text-[12.5px] sm:block" style={{ color: "var(--text-3)" }}>
                    {c.subtitle}
                  </span>
                  {idx === i && <ArrowRight size={14} style={{ color: "var(--accent)" }} />}
                </button>
              </div>
            ))}
          </div>

          <aside
            className="hidden w-[260px] shrink-0 border-l p-5 lg:block"
            style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
          >
            {active ? (
              <div>
                <div className="label">{active.group}</div>
                <p className="mt-3 text-[17px] font-semibold leading-snug" style={{ letterSpacing: "-0.02em" }}>
                  {active.title}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {active.subtitle}
                </p>
                <div className="mt-5 flex items-center gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
                  <Command size={13} /> Enter para abrir · ↑↓ para navegar
                </div>
              </div>
            ) : (
              <div className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                Comece digitando para buscar em todo o sistema.
              </div>
            )}
          </aside>
        </div>

        <footer
          className="flex items-center justify-between px-5 py-2.5 text-[11.5px]"
          style={{ borderTop: "1px solid var(--line)", color: "var(--text-3)" }}
        >
          <span className="mono">{results.length} resultado(s)</span>
          <span className="hidden sm:block">Busca global — clientes, OS, orçamentos, serviços, notas e agenda</span>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export function Shell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <Rail onSearch={() => setPaletteOpen(true)} />
      <TopBar onSearch={() => setPaletteOpen(true)} onMenu={() => setDrawer(true)} />

      <main className="md:pl-[78px]">
        <div className="mx-auto w-full max-w-[1360px] px-4 pb-24 pt-6 sm:px-7 sm:pt-8">{children}</div>
      </main>

      {/* barra inferior no mobile */}
      <nav
        className="glass fixed bottom-0 left-0 right-0 z-40 flex gap-1 overflow-x-auto px-2 py-2 md:hidden"
        style={{ borderTop: "1px solid var(--line)" }}
        aria-label="Navegação"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5"
              style={{ color: active ? "var(--accent)" : "var(--text-2)" }}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
              <span className="text-[9.5px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fade absolute inset-0" style={{ background: "var(--scrim)" }} onClick={() => setDrawer(false)} />
          <div
            className="sheet-in absolute left-0 top-0 h-full w-[76%] max-w-xs p-5"
            style={{ background: "var(--panel)", borderRight: "1px solid var(--line)" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark size={34} />
                <div>
                  <p className="text-[15px] font-semibold">GBR Soluções</p>
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>seu sobrinho de aluguel</p>
                </div>
              </div>
              <button className="btn btn-ghost h-8 w-8 rounded-full p-0" onClick={() => setDrawer(false)} aria-label="Fechar menu" type="button">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawer(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]"
                    style={{ background: active ? "var(--accentSoft)" : "transparent", color: active ? "var(--accent)" : "var(--text)" }}
                  >
                    <Icon size={18} /> {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <Toasts />
    </div>
  );
}

export { fmtDate };
