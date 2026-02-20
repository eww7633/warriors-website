import Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordStripeCheckoutCompleted } from "@/lib/hq/donations";
import { sendDonationReceiptEmail } from "@/lib/email";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const payment = await recordStripeCheckoutCompleted({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      amountTotalCents: session.amount_total ?? undefined,
      currency: session.currency ?? "usd",
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email || undefined,
      customerName: session.customer_details?.name || undefined,
      intentId: session.metadata?.intentId || undefined
    });

    if (payment.status === "paid" && payment.donorEmail) {
      await sendDonationReceiptEmail({
        to: payment.donorEmail,
        fullName: payment.donorName,
        amountUsd: payment.amountUsd,
        receiptId: payment.id
      });
    }
  }

  return NextResponse.json({ received: true });
}
