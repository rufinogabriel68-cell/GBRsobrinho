import { NextResponse } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function load(token: string) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.token, token));
  if (!order) return null;
  const client = order.clientId
    ? (await db.select().from(s.clients).where(eq(s.clients.id, order.clientId)))[0]
    : null;
  const messages = await db
    .select()
    .from(s.orderMessages)
    .where(eq(s.orderMessages.orderId, order.id))
    .orderBy(asc(s.orderMessages.createdAt));
  return { order, client, messages };
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const data = await load(token);
  if (!data) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404 });
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.token, token));
  if (!order) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404 });

  const body = await req.json().catch(() => ({}) as any);

  if (typeof body.body === "string" && body.body.trim()) {
    await db.insert(s.orderMessages).values({
      orderId: order.id,
      author: "cliente",
      body: body.body.trim().slice(0, 1200),
    });
  }
  if (typeof body.signature === "string") {
    await db.update(s.orders).set({ signature: body.signature }).where(eq(s.orders.id, order.id));
  }
  if (typeof body.approved === "boolean" && body.approved) {
    await db.update(s.orders).set({ status: "aprovada" }).where(eq(s.orders.id, order.id));
  }

  const data = await load(token);
  return NextResponse.json({ ok: true, ...data });
}
