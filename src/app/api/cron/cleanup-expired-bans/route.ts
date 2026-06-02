import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const result = await db.user.updateMany({
      where: {
        banned: true,
        banExpires: { lt: now },
      },
      data: { banned: false, banExpires: null, banReason: null },
    });

    return NextResponse.json({
      message: "Expired bans cleared",
      cleared: result.count,
      ranAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error during expired-ban cleanup:", error);
    return NextResponse.json(
      {
        error: "Internal server error during cleanup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
