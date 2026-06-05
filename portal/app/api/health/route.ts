// Health check endpoint — used by Railway for zero-downtime deploys.
// No auth required (excluded from middleware matcher via isPublic check).
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json(
      { ok: true, service: "navon-portal", ts: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    console.error("[health] db ping failed:", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
