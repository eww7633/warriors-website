import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySessionByToken } from "@/lib/hq/session";

export async function POST(request: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await destroySessionByToken(token);

  const response = NextResponse.redirect(new URL("/login?logged_out=1", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
