import { NextResponse } from "next/server";
import Stripe from "stripe";
import { attachCheckoutSessionToIntent, createDonationIntent } from "@/lib/hq/donations";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const amountRaw = String(formData.get("amountUsd") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "one_time").trim();
  const message = String(formData.get("message") ?? "").trim();

  const amountUsd = Number(amountRaw || "0");
  if (!fullName || !email || !Number.isFinite(amountUsd) || amountUsd < 1) {
    return NextResponse.redirect(new URL("/donate?error=invalid_checkout_fields", request.url), 303);
  }

  try {
    const stripe = getStripeClient();
    const intent = await createDonationIntent({
      fullName,
      email,
      amountUsd,
      frequency,
      message,
      source: "public_site"
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const mode = frequency === "monthly" || frequency === "annual" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: email,
      success_url: `${baseUrl}/donate?checkout=success`,
      cancel_url: `${baseUrl}/donate?checkout=cancelled`,
      metadata: {
        intentId: intent.id,
        fullName,
        frequency
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Pittsburgh Warriors Donation",
              description: message || `Donation (${frequency})`
            },
            unit_amount: Math.round(amountUsd * 100),
            recurring:
              mode === "subscription"
                ? {
                    interval: frequency === "annual" ? "year" : "month"
                  }
                : undefined
          }
        }
      ]
    });

    await attachCheckoutSessionToIntent({
      intentId: intent.id,
      stripeCheckoutSessionId: session.id
    });

    if (!session.url) {
      return NextResponse.redirect(new URL("/donate?error=checkout_session_failed", request.url), 303);
    }

    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(new URL("/donate?error=stripe_checkout_failed", request.url), 303);
  }
}
