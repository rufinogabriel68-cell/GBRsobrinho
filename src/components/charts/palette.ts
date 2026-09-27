"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export interface ChartPalette {
  primary: string;
  grid: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

/**
 * Cores dos gráficos acompanhando o tema ativo.
 * O painel abre por padrão no modo escuro.
 */
export function useChartPalette(): ChartPalette {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = !mounted || resolvedTheme === "dark";

  return dark
    ? {
        primary: "#34d399",
        grid: "#27272a",
        label: "#a1a1aa",
        tooltipBg: "#18181b",
        tooltipBorder: "#3f3f46",
        tooltipText: "#fafafa",
      }
    : {
        primary: "#059669",
        grid: "#e4e4e7",
        label: "#71717a",
        tooltipBg: "#ffffff",
        tooltipBorder: "#d4d4d8",
        tooltipText: "#18181b",
      };
}
