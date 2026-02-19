import { NextResponse } from "next/server";
import { completeQrCheckIn } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/check-in/scan?error=missing_token", request.url), 303);
  }

  try {
    await completeQrCheckIn({ token, userId: actor.id });
    return NextResponse.redirect(new URL("/check-in/scan?checkedIn=1", request.url), 303);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "qr_check_in_failed";
    return NextResponse.redirect(
      new URL(`/check-in/scan?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(token)}`, request.url),
      303
    );
  }
}
