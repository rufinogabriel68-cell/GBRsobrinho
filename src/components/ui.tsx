"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, X, Plus } from "lucide-react";
import { useStore } from "@/lib/store";

/* ------------------------------------------------------------------ atoms */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  hover,
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cx("card", hover && "card-hover", className)} onClick={onClick} style={style}>
      {children}
    </div>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("label", className)}>{children}</div>;
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rise mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Label>{eyebrow}</Label>
        <h1 className="h-display mt-2 truncate">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const TONES: Record<string, string> = {
  blue: "var(--accentSoft), var(--accent)",
  green: "var(--greenSoft), var(--green)",
  amber: "var(--amberSoft), var(--amber)",
  red: "var(--redSoft), var(--red)",
  purple: "var(--purpleSoft), var(--purple)",
  grey: "var(--greySoft), var(--text-2)",
};

export function Badge({ tone = "grey", children, dot = true }: { tone?: string; children: ReactNode; dot?: boolean }) {
  const [soft, solid] = (TONES[tone] || TONES.grey).split(", ");
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap"
      style={{ background: soft, color: solid }}
    >
      {dot && <span className="h-[6px] w-[6px] rounded-full" style={{ background: solid }} />}
      {children}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px]" style={{ color: "var(--text-3)" }}>{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "blue", thick = false }: { value: number; tone?: string; thick?: boolean }) {
  const color =
    tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : tone === "red" ? "var(--red)" : "var(--accent)";
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx("w-full overflow-hidden rounded-full", thick ? "h-3" : "h-2")}
      style={{ background: "var(--grey-soft)" }}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${v}%`, background: color, boxShadow: `0 0 16px -4px ${color}` }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" data-active={o.value === value} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl"
        style={{ background: "var(--accentSoft)", color: "var(--accent)" }}
      >
        {icon}
      </div>
      <p className="text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{title}</p>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="fade absolute inset-0" style={{ background: "var(--scrim)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div
        className={cx(
          "sheet-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] sm:rounded-[26px]",
          wide ? "sm:max-w-4xl" : "sm:max-w-xl",
        )}
        style={{ background: "var(--panel)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2 className="text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{title}</h2>
          <button className="btn btn-ghost h-8 w-8 rounded-full p-0" onClick={onClose} aria-label="Fechar" type="button">
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer
            className="flex flex-wrap items-center justify-end gap-2 px-6 py-4"
            style={{ borderTop: "1px solid var(--line)", background: "var(--panel-2)" }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Botão de exclusão em duas etapas — evita acidental sem dialog do sistema. */
export function DangerButton({ onConfirm, label = "Excluir" }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed)
    return (
      <button className="btn btn-ghost text-[13px]" type="button" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  return (
    <button className="btn btn-danger text-[13px]" type="button" onClick={onConfirm}>
      <Check size={14} /> Confirmar
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        className="input pl-9"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-3)"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ background: "var(--grey-soft)", color: "var(--text-2)" }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- dialog */

type DialogCtx = { confirm: (msg: string) => Promise<boolean> };
const DialogCtx = createContext<DialogCtx>({ confirm: async () => true });

export function DialogHost({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((msg: string) => new Promise<boolean>((resolve) => setPending({ msg, resolve })), []);

  return (
    <DialogCtx.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="fade absolute inset-0" style={{ background: "var(--scrim)" }} onClick={() => { pending.resolve(false); setPending(null); }} />
          <div
            className="sheet-in relative w-full max-w-sm overflow-hidden rounded-[22px] p-6 text-center"
            style={{ background: "var(--panel)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)" }}
          >
            <p className="text-[15px] font-semibold">{pending.msg}</p>
            <div className="mt-5 flex gap-2">
              <button className="btn flex-1" type="button" onClick={() => { pending.resolve(false); setPending(null); }}>
                Cancelar
              </button>
              <button className="btn btn-primary flex-1" type="button" onClick={() => { pending.resolve(true); setPending(null); }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(DialogCtx).confirm;
}

/* ----------------------------------------------------------------- toasts */

export function Toasts() {
  const { notifications } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="sheet-in glass pointer-events-auto flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px]"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.tone === "amber" ? "var(--amber)" : n.tone === "green" ? "var(--green)" : "var(--accent)" }} />
          <span style={{ color: "var(--text)" }}>{n.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- signature pad */

export function SignaturePad({
  value,
  onChange,
  height = 190,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text") || "#111";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [setup]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair touch-none rounded-2xl"
        style={{ height, background: "var(--inset)", border: "1px dashed var(--line-strong)" }}
        onPointerDown={(e) => {
          const ctx = canvasRef.current!.getContext("2d")!;
          ctx.beginPath();
          const p = pos(e);
          ctx.moveTo(p.x, p.y);
          drawing.current = true;
          dirty.current = true;
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (dirty.current) onChange(canvasRef.current!.toDataURL("image/png"));
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Assinhe com o dedo ou o mouse
        </span>
        <button
          className="btn btn-ghost h-7 px-3 text-[12.5px]"
          type="button"
          onClick={() => {
            const c = canvasRef.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            dirty.current = false;
            onChange(null);
          }}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- misc bits */

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="btn btn-primary" type="button" onClick={onClick}>
      <Plus size={16} strokeWidth={2.4} /> {children}
    </button>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("row", className)}>{children}</div>;
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={cx("label sticky top-0 z-10 px-4 py-3 text-left", right && "text-right")}
      style={{ background: "var(--panel)" }}
    >
      {children}
    </th>
  );
}
