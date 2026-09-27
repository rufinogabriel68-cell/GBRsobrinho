import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";

const COOKIE = "gbr_auth";

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");
  const next = String(form?.get("next") ?? "/");
  const target = next.startsWith("/") ? next : "/";

  const base = requestOrigin(req);
  if (!expected) return NextResponse.redirect(new URL(target, base), { status: 303 });

  if (!password || !safeEqual(password, expected)) {
    return NextResponse.redirect(new URL("/login?erro=1", base), { status: 303 });
  }

  const res = NextResponse.redirect(new URL(target, base), { status: 303 });
  res.cookies.set({
    name: COOKIE,
    value: await sessionToken(expected),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
