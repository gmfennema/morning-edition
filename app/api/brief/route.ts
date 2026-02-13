import { NextRequest, NextResponse } from "next/server";

import { saveLatestBriefing } from "../../../lib/storage";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const shared = process.env.MORNING_EDITION_SHARED_SECRET;
  if (!shared) return false;

  const headerSecret = req.headers.get("x-shared-secret");
  if (headerSecret && headerSecret === shared) return true;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length);
    if (token === shared) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const stored = await saveLatestBriefing(data);
  return NextResponse.json({ ok: true, storedAt: stored.storedAt });
}
