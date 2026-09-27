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
  applyThemeColor(dark ? "#000000" : "#F5F5F7");
}

/**
 * A cor da barra do navegador/aparelho. O Next gera duas metas (uma para cada
 * preferência do sistema); como o usuário pode escolher o tema manualmente,
 * deixamos uma única meta sem `media` mandando — senão a barra fica preta num
 * app claro (e vice-versa) quando a escolha difere do sistema.
 */
function applyThemeColor(color: string) {
  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  if (!metas.length) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas[0].removeAttribute("media");
  metas[0].setAttribute("content", color);
  metas.slice(1).forEach((m) => m.remove());
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

function subscribeSystem(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

const getSystemDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Tema com três estados (claro → escuro → automático), lido via
 * `useSyncExternalStore` — o valor do localStorage entra na renderização sem
 * setState em efeito e continua igual entre servidor e cliente (SSR usa "auto").
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readStoredTheme, () => "auto");
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemDark, () => false);
  const resolved: "light" | "dark" = theme === "dark" || (theme === "auto" && systemDark) ? "dark" : "light";

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

  return { theme, resolved, apply, cycle };
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
