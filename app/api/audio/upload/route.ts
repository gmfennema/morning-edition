import { NextRequest, NextResponse } from "next/server";

import { saveLatestAudio } from "../../../../lib/audio";

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

  const contentType = req.headers.get("content-type") || "audio/mpeg";

  let buf: Uint8Array;
  try {
    const ab = await req.arrayBuffer();
    buf = new Uint8Array(ab);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  if (!buf.byteLength) {
    return NextResponse.json(
      { ok: false, error: "empty_audio" },
      { status: 400 },
    );
  }

  const stored = await saveLatestAudio(buf, { contentType });

  return NextResponse.json({
    ok: true,
    storedAt: stored.storedAt,
    bytes: stored.bytes,
    contentType: stored.contentType,
  });
}
