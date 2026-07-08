import { NextRequest, NextResponse } from "next/server";
import { getFixtureStreamStatus } from "@/lib/txline/session";

export async function GET(request: NextRequest) {
  const fixtureId = Number(request.nextUrl.searchParams.get("fixtureId"));
  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId is required" }, { status: 400 });
  }

  try {
    const status = await getFixtureStreamStatus(fixtureId);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 502 });
  }
}
