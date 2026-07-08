import { NextRequest, NextResponse } from "next/server";
import { fetchLatestForFixture } from "@/lib/txline/session";

const DEFAULT_STAT_KEY = 1002;

export async function GET(request: NextRequest) {
  const fixtureId = Number(request.nextUrl.searchParams.get("fixtureId"));
  const statKey = Number(request.nextUrl.searchParams.get("statKey") ?? DEFAULT_STAT_KEY);

  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId is required" }, { status: 400 });
  }

  try {
    const batch = await fetchLatestForFixture(fixtureId, statKey);
    if (!batch) {
      return NextResponse.json({ live: false });
    }
    return NextResponse.json({
      live: true,
      minTimestamp: batch.summary?.updateStats?.minTimestamp ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 502 });
  }
}
