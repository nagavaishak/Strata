import { NextRequest, NextResponse } from "next/server";
import { fetchLatestForFixtureV2 } from "@/lib/txline/session";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fixtureId = Number(params.get("fixtureId"));
  const statKeysParam = params.get("statKeys"); // comma-separated, e.g. "1,2"
  const sinceMsParam = params.get("sinceMs");
  const sinceMs = sinceMsParam ? Number(sinceMsParam) : undefined;

  if (!fixtureId || !statKeysParam) {
    return NextResponse.json({ error: "fixtureId and statKeys are required" }, { status: 400 });
  }
  const statKeys = statKeysParam.split(",").map(Number);

  try {
    const proof = await fetchLatestForFixtureV2(fixtureId, statKeys, sinceMs);
    if (!proof) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, proof });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 502 });
  }
}
