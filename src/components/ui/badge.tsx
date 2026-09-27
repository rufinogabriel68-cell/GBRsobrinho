import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25",
  success:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/30",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-1 ring-inset ring-sky-500/30",
  danger:
    "bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-500/30",
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
