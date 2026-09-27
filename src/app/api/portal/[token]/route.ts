import { NextResponse } from "next/server";
import { friendlyDbError, getStore } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const store = getStore();
    const data = await store.findOrderByToken(token);
    if (!data) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404 });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("portal GET failed", err);
    return NextResponse.json({ ok: false, error: friendlyDbError(err) }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  try {
    const store = getStore();
    const found = await store.findOrderByToken(token);
    if (!found) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404 });
    const order = found.order;

    const body = (await req.json().catch(() => ({}))) as {
      body?: string;
      signature?: string;
      approved?: boolean;
    };

    if (typeof body.body === "string" && body.body.trim()) {
      await store.addOrderMessage(Number(order.id), body.body);
    }
    if (typeof body.signature === "string" && body.signature.length < 900_000) {
      await store.updateOrder(Number(order.id), { signature: body.signature });
    }
    if (typeof body.approved === "boolean" && body.approved && order.status === "aberta") {
      // "aprovada" é um status válido no app
      await store.updateOrder(Number(order.id), { status: "aprovada" });
    }

    const data = await store.findOrderByToken(token);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("portal POST failed", err);
    return NextResponse.json({ ok: false, error: friendlyDbError(err) }, { status: 500 });
  }
}
