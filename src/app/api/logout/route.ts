import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sai do painel (só faz sentido quando APP_PASSWORD está configurada). */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", requestOrigin(req)), { status: 303 });
  res.cookies.set({ name: "gbr_auth", value: "", path: "/", maxAge: 0 });
  return res;
}

export const POST = GET;
