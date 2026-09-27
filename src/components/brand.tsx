import { cn } from "@/lib/utils";

/** Marca visual do painel (usada no login, sidebar e topbar) */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-[11px] font-bold tracking-tight text-white shadow-sm",
        className
      )}
      aria-hidden
    >
      GBR
    </span>
  );
}
