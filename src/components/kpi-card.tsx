import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = "neutral",
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  /** ex.: "+12,4% vs. mês anterior" */
  trend?: string | null;
  trendDirection?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {trend ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            trendDirection === "up" && "text-emerald-500",
            trendDirection === "down" && "text-red-500",
            trendDirection === "neutral" && "text-muted-foreground"
          )}
        >
          {trendDirection === "down" ? (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          )}
          {trend}
        </p>
      ) : null}
    </Card>
  );
}
