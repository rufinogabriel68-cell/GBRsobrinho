"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Provedor de tema (claro/escuro/sistema) com classe no <html>.
 * O painel abre por padrão no modo ESCURO — requisito do projeto.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
