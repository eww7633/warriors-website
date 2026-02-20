import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "pghwarriorhockey.us";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() || "";

  if (host.startsWith("hq.pghwarriorhockey.us")) {
    const target = request.nextUrl.clone();
    target.protocol = "https:";
    target.host = CANONICAL_HOST;
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*"
};
