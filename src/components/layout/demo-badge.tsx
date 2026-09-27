import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selo "Modo demonstração" — exibido quando o Firebase não está configurado */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400",
        className
      )}
    >
      <FlaskConical className="h-3 w-3" aria-hidden />
      Modo demonstração
    </span>
  );
}
