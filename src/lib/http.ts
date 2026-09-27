/** Utilitários de requisição compartilhados (sem dependências do banco). */

/** URL base da requisição — funciona atrás do proxy da Vercel. */
export function requestOrigin(req: Request): string {
  const headers = req.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}
