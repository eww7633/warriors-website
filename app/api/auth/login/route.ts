import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionRecord } from "@/lib/hq/session";
import { authenticateUser } from "@/lib/hq/store";

export async function POST(request: Request) {
  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=missing_credentials", request.url), 303);
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }

  const { token, expiresAt } = await createSessionRecord(user.id);
  const destination = user.role === "admin" ? "/admin" : "/player";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/"
  });

  return response;
}
