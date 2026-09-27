"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "auto";

export const THEME_KEY = "gbr.theme";

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Resolve "auto" para o tema real do sistema e aplica no <html>. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "dark" || (theme === "auto" && prefersDark()) ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const dark = resolveTheme(theme) === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#000000" : "#F5F5F7");
}

/* ------------------------------- tema (leitura no "external store") */

const listeners = new Set<() => void>();

const readStoredTheme = (): Theme =>
  ((typeof window !== "undefined" && (window.localStorage.getItem(THEME_KEY) as Theme | null)) || "auto");

function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function emitTheme() {
  listeners.forEach((l) => l());
}

/**
 * Tema com três estados (claro → escuro → automático), lido via
 * `useSyncExternalStore` — o valor do localStorage entra na renderização sem
 * setState em efeito e continua igual entre servidor e cliente (SSR usa "auto").
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readStoredTheme, () => "auto");

  const apply = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* modo privado */
    }
    applyTheme(next);
    emitTheme();
  }, []);

  const cycle = useCallback(() => {
    const current = readStoredTheme();
    apply(current === "dark" ? "light" : current === "light" ? "auto" : "dark");
  }, [apply]);

  // aplica o tema salvo/sistema no <html> e acompanha mudanças do sistema
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return { theme, apply, cycle };
}

/**
 * Relógio do componente. Começa em 0 (desconhecido) e é preenchido no primeiro
 * efeito — evita chamar `Date.now()` durante a renderização (regra de pureza
 * do React) e mantém filtros de data atualizados sem re-render desnecessário.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
