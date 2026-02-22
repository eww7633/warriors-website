"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSessionRecord } from "@/lib/hq/session";
import { authenticateUser } from "@/lib/hq/store";
import { canAccessAdminPanel } from "@/lib/hq/permissions";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    redirect("/login?error=invalid_credentials");
  }

  const { token, expiresAt } = await createSessionRecord(user.id);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/"
  });

  const adminAccess = await canAccessAdminPanel(user);
  if (adminAccess) {
    redirect("/admin");
  }
  if (user.role === "public") {
    redirect("/account");
  }
  redirect("/player");
}
