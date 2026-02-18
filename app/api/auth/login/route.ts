import { NextResponse } from "next/server";
import { createSession } from "@/lib/hq/session";
import { findUserByEmail, hashPassword } from "@/lib/hq/store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=missing_credentials", request.url));
  }

  const user = await findUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url));
  }

  await createSession(user.id);

  if (user.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.redirect(new URL("/player", request.url));
}
