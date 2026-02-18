import { NextResponse } from "next/server";
import { createPendingPlayer } from "@/lib/hq/store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const requestedPosition = String(formData.get("position") ?? "").trim();

  if (!fullName || !email || !password) {
    return NextResponse.redirect(new URL("/register?error=missing_fields", request.url), 303);
  }

  if (password.length < 8) {
    return NextResponse.redirect(new URL("/register?error=password_too_short", request.url), 303);
  }

  try {
    await createPendingPlayer({
      fullName,
      email,
      password,
      phone,
      requestedPosition
    });
    return NextResponse.redirect(new URL("/login?registered=1", request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(message)}`, request.url),
      303
    );
  }
}
