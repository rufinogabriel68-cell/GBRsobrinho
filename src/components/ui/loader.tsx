import { Loader2 } from "lucide-react";

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Carregando" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
