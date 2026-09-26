import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { DialogHost } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DialogHost>
      <Shell>{children}</Shell>
    </DialogHost>
  );
}
