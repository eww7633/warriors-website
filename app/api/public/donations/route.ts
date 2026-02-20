import { NextResponse } from "next/server";
import { createDonationIntent } from "@/lib/hq/donations";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const amountRaw = String(formData.get("amountUsd") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "one_time").trim();
  const message = String(formData.get("message") ?? "").trim();
  const amountUsd = amountRaw ? Number(amountRaw) : undefined;

  try {
    await createDonationIntent({
      fullName,
      email,
      amountUsd: Number.isFinite(amountUsd) ? amountUsd : undefined,
      frequency,
      message,
      source: "public_site"
    });
    return NextResponse.redirect(new URL("/donate?sent=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/donate?error=donation_intake_failed", request.url), 303);
  }
}
