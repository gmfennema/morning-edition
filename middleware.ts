import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="The Morning Edition"',
    },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow ingestion and debug endpoints through; they have their own shared-secret auth.
  if (
    pathname === "/api/brief" ||
    pathname === "/api/brief/" ||
    pathname === "/api/debug" ||
    pathname === "/api/debug/"
  ) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If not configured, don't block (useful for local dev).
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const encoded = auth.split(" ")[1] ?? "";
    const decoded = atob(encoded);
    const idx = decoded.indexOf(":");
    const givenUser = idx >= 0 ? decoded.slice(0, idx) : decoded;
    const givenPass = idx >= 0 ? decoded.slice(idx + 1) : "";

    if (givenUser !== user || givenPass !== pass) return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
