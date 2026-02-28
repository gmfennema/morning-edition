import { NextRequest, NextResponse } from "next/server";

import { readLatestBriefing } from "../../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const shared = process.env.MORNING_EDITION_SHARED_SECRET;
  const headerSecret = req.headers.get("x-shared-secret");

  if (!shared || headerSecret !== shared) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const latest = await readLatestBriefing();
    return NextResponse.json({ ok: true, latest });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "debug_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
