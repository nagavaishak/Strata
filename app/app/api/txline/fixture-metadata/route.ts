import { NextRequest, NextResponse } from "next/server";
import { getFixtureMetadata } from "@/lib/txline/session";

export async function GET(request: NextRequest) {
  const fixtureId = Number(request.nextUrl.searchParams.get("fixtureId"));
  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId is required" }, { status: 400 });
  }

  try {
    const metadata = await getFixtureMetadata(fixtureId);
    return NextResponse.json(metadata);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 502 });
  }
}
