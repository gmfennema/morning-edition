import { NextRequest, NextResponse } from "next/server";

import { getLatestAudio } from "../../../../lib/audio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickHeader(h: { get(name: string): string | null }, key: string): string | null {
  return h.get(key) ?? h.get(key.toLowerCase()) ?? null;
}

export async function GET(req: NextRequest) {
  const range = req.headers.get("range");
  const res = await getLatestAudio(range);

  if (!res || res.statusCode === 304 || !res.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = res.headers;
  const out = new Headers();

  const pass = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ];

  for (const k of pass) {
    const v = pickHeader(upstream, k);
    if (v) out.set(k, v);
  }

  // Avoid caching protected audio responses.
  out.set("cache-control", "no-store, max-age=0");

  const contentRange = pickHeader(upstream, "content-range");
  const status = range && contentRange ? 206 : 200;

  return new NextResponse(res.stream, { status, headers: out });
}
