import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { isValidReservationStatus, setEventReservation } from "@/lib/hq/reservations";
import { getEventSignupConfig, isInterestSignupClosed } from "@/lib/hq/event-signups";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/calendar";
  }
  return value;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const eventId = String(formData.get("eventId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/calendar"));

  if (!eventId || !isValidReservationStatus(status)) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=invalid_reservation_fields`, request.url),
      303
    );
  }

  const signupConfig = await getEventSignupConfig(eventId);
  if (
    user.role !== "admin" &&
    signupConfig?.signupMode === "interest_gathering" &&
    isInterestSignupClosed(signupConfig)
  ) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=interest_signup_closed`, request.url),
      303
    );
  }

  try {
    await setEventReservation({
      userId: user.id,
      eventId,
      status,
      note
    });
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}reservation=saved`, request.url),
      303
    );
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=reservation_save_failed`, request.url),
      303
    );
  }
}
