import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "gbr_auth";

/** Token derivado da senha — guardado em cookie httpOnly (nunca a senha crua). */
async function sessionToken(password: string) {
  const bytes = new TextEncoder().encode(`gbr-session:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Proteção opcional do painel. Sem `APP_PASSWORD`, o app continua aberto
 * (o portal do cliente e o login seguem liberados em qualquer caso).
 */
export default async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const expected = await sessionToken(password);
  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // tudo, exceto: arquivos internos, assets, imagens, login, portal do cliente e health
    "/((?!_next|images|login|api/login|api/logout|api/health|portal|api/portal|icon.svg|icon-maskable.svg|manifest.webmanifest|sw.js|robots.txt).*)",
  ],
};
