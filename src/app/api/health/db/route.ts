import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`select count(*)::int as count from tasks`;
    const count = rows[0]?.count ?? 0;
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json(
      { ok: false, error: { code: "DB_ERROR", message } },
      { status: 500 },
    );
  }
}
