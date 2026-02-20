import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySessionByToken } from "@/lib/hq/session";

export async function GET(request: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await destroySessionByToken(token);

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo");
  const fallback = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "/";
  const target = returnTo && /^https?:\/\//i.test(returnTo) ? returnTo : fallback;
  const response = NextResponse.redirect(target, 303);
  response.cookies.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
