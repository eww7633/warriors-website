import { NextResponse } from "next/server";
import { createSupporterUser } from "@/lib/hq/store";
import { listOpsAlertRecipients } from "@/lib/hq/ops-alerts";
import { sendOpsRegistrationAlertEmail } from "@/lib/email";

export async function POST(request: Request) {
  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const inviteLinkUsed = String(formData.get("inviteLinkUsed") ?? "").trim() === "1";

  if (!fullName || !email || !password) {
    return NextResponse.redirect(new URL("/join?mode=supporter&error=missing_fields", request.url), 303);
  }
  if (password.length < 8) {
    return NextResponse.redirect(new URL("/join?mode=supporter&error=password_too_short", request.url), 303);
  }

  try {
    await createSupporterUser({
      fullName,
      email,
      password,
      phone: phone || undefined
    });

    try {
      const recipients = await listOpsAlertRecipients();
      await sendOpsRegistrationAlertEmail({
        recipients,
        registrantName: fullName,
        registrantEmail: email,
        registrationType: "supporter",
        inviteLinkUsed
      });
    } catch {
      // Never block registration flow on notification failures.
    }

    return NextResponse.redirect(new URL("/login?registered=supporter", request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.redirect(
      new URL(`/join?mode=supporter&error=${encodeURIComponent(message)}`, request.url),
      303
    );
  }
}
