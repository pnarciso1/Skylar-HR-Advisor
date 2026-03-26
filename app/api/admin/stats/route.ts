import { NextRequest, NextResponse } from "next/server";
import { getAdminStats } from "@/lib/firebase";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  // ── Authentication ────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return unauthorized();
  }

  // ── Query params ──────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const daysParam = searchParams.get("days");
  const daysBack = daysParam !== null ? parseInt(daysParam, 10) : 14;

  if (isNaN(daysBack) || daysBack < 0) {
    return NextResponse.json(
      { error: "Invalid 'days' parameter — must be a non-negative integer" },
      { status: 400 }
    );
  }

  // ── Fetch & aggregate ─────────────────────────────────────────────────────
  try {
    const stats = await getAdminStats(daysBack);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[/api/admin/stats] Firestore error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats from Firestore" },
      { status: 500 }
    );
  }
}
