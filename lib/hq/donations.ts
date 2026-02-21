import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";

export type DonationIntent = {
  id: string;
  fullName: string;
  email: string;
  amountUsd?: number;
  frequency: "one_time" | "monthly" | "annual";
  message?: string;
  source: "public_site" | "admin_manual";
  status: "new" | "contacted" | "processed";
  stripeCheckoutSessionId?: string;
  createdAt: string;
  updatedAt: string;
  updatedByUserId?: string;
};

export type DonationPayment = {
  id: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  intentId?: string;
  donorEmail?: string;
  donorName?: string;
  amountUsd: number;
  currency: string;
  status: "paid" | "unpaid";
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

type DonationStore = {
  intents: DonationIntent[];
  payments: DonationPayment[];
};

const defaultStore: DonationStore = {
  intents: [],
  payments: []
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.DONATION_STORE_PATH) {
    return process.env.DONATION_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/donations.json";
  }
  return path.join(process.cwd(), "data", "donations.json");
}

function normalizeText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureStoreFile() {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<DonationStore>("donations", defaultStore);
    return {
      intents: Array.isArray(parsed.intents) ? parsed.intents : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : []
    } satisfies DonationStore;
  }

  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await fs.readFile(storePath(), "utf-8")) as Partial<DonationStore>;
    return {
      intents: Array.isArray(parsed.intents) ? parsed.intents : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : []
    } satisfies DonationStore;
  } catch {
    return { ...defaultStore };
  }
}

async function writeStore(store: DonationStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("donations", store);
    return;
  }

  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listDonationIntents() {
  const store = await readStore();
  return [...store.intents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function listDonationPayments() {
  const store = await readStore();
  return [...store.payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createDonationIntent(input: {
  fullName: string;
  email: string;
  amountUsd?: number;
  frequency?: string;
  message?: string;
  source: "public_site" | "admin_manual";
}) {
  const fullName = normalizeText(input.fullName);
  const email = normalizeText(input.email);
  if (!fullName || !email) {
    throw new Error("missing_donation_fields");
  }

  const frequency =
    input.frequency === "monthly" || input.frequency === "annual" ? input.frequency : "one_time";
  const amountUsd = typeof input.amountUsd === "number" && input.amountUsd > 0 ? input.amountUsd : undefined;

  const store = await readStore();
  const now = nowIso();
  const next: DonationIntent = {
    id: crypto.randomUUID(),
    fullName,
    email: normalizeEmail(email),
    amountUsd,
    frequency,
    message: normalizeText(input.message),
    source: input.source,
    status: "new",
    createdAt: now,
    updatedAt: now
  };
  store.intents.push(next);
  await writeStore(store);
  return next;
}

export async function attachCheckoutSessionToIntent(input: {
  intentId: string;
  stripeCheckoutSessionId: string;
}) {
  const store = await readStore();
  const intent = store.intents.find((entry) => entry.id === input.intentId);
  if (!intent) {
    throw new Error("donation_intent_not_found");
  }
  intent.stripeCheckoutSessionId = input.stripeCheckoutSessionId;
  intent.updatedAt = nowIso();
  await writeStore(store);
  return intent;
}

export async function updateDonationIntentStatus(input: {
  id: string;
  status: "new" | "contacted" | "processed";
  updatedByUserId: string;
}) {
  const store = await readStore();
  const record = store.intents.find((entry) => entry.id === input.id);
  if (!record) {
    throw new Error("donation_intent_not_found");
  }

  record.status = input.status;
  record.updatedAt = nowIso();
  record.updatedByUserId = input.updatedByUserId;

  await writeStore(store);
  return record;
}

export async function recordStripeCheckoutCompleted(input: {
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  amountTotalCents?: number;
  currency?: string;
  paymentStatus?: string;
  customerEmail?: string;
  customerName?: string;
  intentId?: string;
}) {
  const store = await readStore();
  const idx = store.payments.findIndex(
    (entry) => entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId
  );

  const amountUsd = Number.isFinite(input.amountTotalCents)
    ? Number((Number(input.amountTotalCents) / 100).toFixed(2))
    : 0;
  const paid = input.paymentStatus === "paid";
  const now = nowIso();

  const next: DonationPayment = {
    id: idx >= 0 ? store.payments[idx].id : crypto.randomUUID(),
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripePaymentIntentId: normalizeText(input.stripePaymentIntentId),
    intentId: normalizeText(input.intentId),
    donorEmail: normalizeText(input.customerEmail)?.toLowerCase(),
    donorName: normalizeText(input.customerName),
    amountUsd,
    currency: (input.currency || "usd").toLowerCase(),
    status: paid ? "paid" : "unpaid",
    paidAt: paid ? now : undefined,
    createdAt: idx >= 0 ? store.payments[idx].createdAt : now,
    updatedAt: now
  };

  if (idx >= 0) {
    store.payments[idx] = next;
  } else {
    store.payments.push(next);
  }

  const intent = input.intentId
    ? store.intents.find((entry) => entry.id === input.intentId)
    : store.intents.find((entry) => entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId);

  if (intent) {
    intent.stripeCheckoutSessionId = input.stripeCheckoutSessionId;
    if (paid) {
      intent.status = "processed";
    }
    intent.updatedAt = now;
  }

  await writeStore(store);
  return next;
}

export async function getDonationLedgerSummary() {
  const store = await readStore();
  const intentsById = new Map(store.intents.map((entry) => [entry.id, entry]));

  const unmatchedPayments = store.payments.filter(
    (payment) => !payment.intentId || !intentsById.has(payment.intentId)
  );
  const intentsWithoutPayment = store.intents.filter(
    (intent) =>
      !store.payments.some(
        (payment) =>
          (payment.intentId && payment.intentId === intent.id) ||
          (intent.stripeCheckoutSessionId && payment.stripeCheckoutSessionId === intent.stripeCheckoutSessionId)
      )
  );

  const totalPaidUsd = store.payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountUsd, 0);

  return {
    intentCount: store.intents.length,
    paymentCount: store.payments.length,
    totalPaidUsd: Number(totalPaidUsd.toFixed(2)),
    unmatchedPayments,
    intentsWithoutPayment
  };
}
