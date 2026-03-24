import { NextResponse } from "next/server";
import type { AdminStats } from "@/lib/types";

export async function GET() {
  try {
    // In production, aggregate from Firestore
    const stats: AdminStats = {
      totalConversations: 0,
      actionPlansDelivered: 0,
      actedIndependently: 0,
      actedIndependentlyPercentage: 0,
      averageConfidence: 0,
      pilotClients: [],
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
