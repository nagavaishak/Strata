import { NextRequest, NextResponse } from "next/server";
import { fetchLatestForFixture } from "@/lib/txline/session";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fixtureId = Number(params.get("fixtureId"));
  const statKey = Number(params.get("statKey"));
  const sinceMsParam = params.get("sinceMs");
  const sinceMs = sinceMsParam ? Number(sinceMsParam) : undefined;

  if (!fixtureId || !statKey) {
    return NextResponse.json({ error: "fixtureId and statKey are required" }, { status: 400 });
  }

  try {
    const proof = await fetchLatestForFixture(fixtureId, statKey, sinceMs);
    if (!proof) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, proof });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 502 });
  }
}
