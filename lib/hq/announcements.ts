import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sendAnnouncementEmail } from "@/lib/email";
import { NotificationCategory, getNotificationPreference } from "@/lib/hq/notifications";
import { readStore } from "@/lib/hq/store";

export type AnnouncementCategory = "general" | "events" | "dvhl" | "urgent";
export type AnnouncementAudience = "players" | "all_users";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  pinned: boolean;
  isActive: boolean;
  publishedAt: string;
  expiresAt?: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementDeliveryChannel = "email" | "sms" | "push";
export type AnnouncementDeliveryStatus = "sent" | "queued" | "skipped" | "failed";

export type AnnouncementDelivery = {
  id: string;
  announcementId: string;
  userId: string;
  channel: AnnouncementDeliveryChannel;
  status: AnnouncementDeliveryStatus;
  reason?: string;
  createdAt: string;
};

export type AnnouncementView = {
  id: string;
  announcementId: string;
  userId: string;
  viewedAt: string;
};

type AnnouncementStore = {
  announcements: Announcement[];
  deliveries: AnnouncementDelivery[];
  views: AnnouncementView[];
};

const defaultStore: AnnouncementStore = {
  announcements: [],
  deliveries: [],
  views: []
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.ANNOUNCEMENT_STORE_PATH) {
    return process.env.ANNOUNCEMENT_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/announcements.json";
  }
  return path.join(process.cwd(), "data", "announcements.json");
}

async function ensureStoreFile() {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<AnnouncementStore>;
    const normalized: AnnouncementStore = {
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      views: Array.isArray(parsed.views) ? parsed.views : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readAnnouncementStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as AnnouncementStore;
}

async function writeAnnouncementStore(store: AnnouncementStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

function toEpoch(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return Number.POSITIVE_INFINITY;
  return stamp;
}

function mapCategoryToPreferenceCategory(category: AnnouncementCategory): NotificationCategory {
  if (category === "dvhl") return "dvhl";
  if (category === "events") return "hockey";
  return "news";
}

function shouldIncludeForAudience(announcement: Announcement, audience?: AnnouncementAudience) {
  if (!audience) return true;
  if (audience === "players") {
    return announcement.audience === "players" || announcement.audience === "all_users";
  }
  return announcement.audience === audience;
}

function sortAnnouncements(list: Announcement[]) {
  return list
    .slice()
    .sort((a, b) => {
      const pinnedDelta = Number(b.pinned) - Number(a.pinned);
      if (pinnedDelta !== 0) return pinnedDelta;
      return toEpoch(b.publishedAt) - toEpoch(a.publishedAt);
    });
}

export async function listAnnouncements(options?: {
  activeOnly?: boolean;
  audience?: AnnouncementAudience;
  includeExpired?: boolean;
  limit?: number;
}) {
  const now = Date.now();
  const store = await readAnnouncementStore();
  let list = store.announcements.filter((entry) => shouldIncludeForAudience(entry, options?.audience));

  if (options?.activeOnly) {
    list = list.filter((entry) => entry.isActive);
  }

  if (!options?.includeExpired) {
    list = list.filter((entry) => !entry.expiresAt || new Date(entry.expiresAt).getTime() >= now);
  }

  const sorted = sortAnnouncements(list);
  if (!options?.limit || options.limit <= 0) {
    return sorted;
  }
  return sorted.slice(0, options.limit);
}

export async function getAnnouncementById(id: string) {
  const store = await readAnnouncementStore();
  return store.announcements.find((entry) => entry.id === id) || null;
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  category?: AnnouncementCategory;
  audience?: AnnouncementAudience;
  pinned?: boolean;
  isActive?: boolean;
  expiresAt?: string;
  actorUserId: string;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw new Error("Title and body are required.");
  }

  const store = await readAnnouncementStore();
  const stamp = nowIso();
  const next: Announcement = {
    id: crypto.randomUUID(),
    title,
    body,
    category: input.category || "general",
    audience: input.audience || "players",
    pinned: Boolean(input.pinned),
    isActive: input.isActive ?? true,
    publishedAt: stamp,
    expiresAt: input.expiresAt?.trim() || undefined,
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
    createdAt: stamp,
    updatedAt: stamp
  };

  store.announcements.push(next);
  await writeAnnouncementStore(store);
  return next;
}

export async function updateAnnouncement(input: {
  id: string;
  title?: string;
  body?: string;
  category?: AnnouncementCategory;
  audience?: AnnouncementAudience;
  pinned?: boolean;
  isActive?: boolean;
  expiresAt?: string;
  actorUserId: string;
}) {
  const store = await readAnnouncementStore();
  const existing = store.announcements.find((entry) => entry.id === input.id);
  if (!existing) {
    throw new Error("Announcement not found.");
  }

  if (typeof input.title === "string") {
    existing.title = input.title.trim();
  }
  if (typeof input.body === "string") {
    existing.body = input.body.trim();
  }
  if (input.category) {
    existing.category = input.category;
  }
  if (input.audience) {
    existing.audience = input.audience;
  }
  if (typeof input.pinned === "boolean") {
    existing.pinned = input.pinned;
  }
  if (typeof input.isActive === "boolean") {
    existing.isActive = input.isActive;
  }
  if (typeof input.expiresAt === "string") {
    existing.expiresAt = input.expiresAt.trim() || undefined;
  }

  if (!existing.title || !existing.body) {
    throw new Error("Title and body are required.");
  }

  existing.updatedByUserId = input.actorUserId;
  existing.updatedAt = nowIso();

  await writeAnnouncementStore(store);
  return existing;
}

export async function deleteAnnouncement(id: string) {
  const store = await readAnnouncementStore();
  const before = store.announcements.length;
  store.announcements = store.announcements.filter((entry) => entry.id !== id);
  if (store.announcements.length === before) {
    return false;
  }
  await writeAnnouncementStore(store);
  return true;
}

export async function listAnnouncementDeliveriesByAnnouncement(announcementId: string) {
  const store = await readAnnouncementStore();
  return store.deliveries.filter((entry) => entry.announcementId === announcementId);
}

export async function markAnnouncementViewed(input: { announcementId: string; userId: string }) {
  const store = await readAnnouncementStore();
  const exists = store.views.find(
    (entry) => entry.announcementId === input.announcementId && entry.userId === input.userId
  );
  if (exists) {
    return exists;
  }
  const next: AnnouncementView = {
    id: crypto.randomUUID(),
    announcementId: input.announcementId,
    userId: input.userId,
    viewedAt: nowIso()
  };
  store.views.push(next);
  await writeAnnouncementStore(store);
  return next;
}

export async function listAnnouncementViewsByAnnouncement(announcementId: string) {
  const store = await readAnnouncementStore();
  return store.views.filter((entry) => entry.announcementId === announcementId);
}

export async function dispatchAnnouncement(input: {
  announcementId: string;
  actorUserId: string;
  hqUrl?: string;
}) {
  const store = await readAnnouncementStore();
  const announcement = store.announcements.find((entry) => entry.id === input.announcementId);
  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  const hqStore = await readStore();
  const recipients = hqStore.users.filter((entry) => {
    if (announcement.audience === "all_users") {
      return entry.status === "approved";
    }
    return entry.role === "player" && entry.status === "approved";
  });

  const category = mapCategoryToPreferenceCategory(announcement.category);
  const createdAt = nowIso();
  const hqUrl = input.hqUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us"}/player?section=announcements&announcement=${announcement.id}`;
  const emailJobs: Array<Promise<{ sent: boolean; reason?: string }>> = [];
  const emailJobMeta: Array<{ userId: string; email: string; fullName: string }> = [];

  for (const recipient of recipients) {
    const pref = await getNotificationPreference(recipient.id);
    const categoryEnabled = Boolean(pref.categories[category]);
    const immediate = pref.frequency === "immediate";

    const channels: AnnouncementDeliveryChannel[] = ["email", "sms", "push"];
    for (const channel of channels) {
      if (!pref.channels[channel] || !categoryEnabled || !immediate) {
        store.deliveries.push({
          id: crypto.randomUUID(),
          announcementId: announcement.id,
          userId: recipient.id,
          channel,
          status: "skipped",
          reason: !pref.channels[channel]
            ? "channel_disabled"
            : !categoryEnabled
            ? "category_disabled"
            : pref.frequency !== "immediate"
            ? `frequency_${pref.frequency}`
            : "not_eligible",
          createdAt
        });
        continue;
      }

      if (channel === "email") {
        emailJobs.push(
          sendAnnouncementEmail({
            to: recipient.email,
            fullName: recipient.fullName,
            title: announcement.title,
            body: announcement.body,
            hqUrl
          })
        );
        emailJobMeta.push({ userId: recipient.id, email: recipient.email, fullName: recipient.fullName });
        continue;
      }

      store.deliveries.push({
        id: crypto.randomUUID(),
        announcementId: announcement.id,
        userId: recipient.id,
        channel,
        status: "queued",
        reason: `${channel}_provider_not_configured`,
        createdAt
      });
    }
  }

  const emailResults = await Promise.all(emailJobs);
  for (let index = 0; index < emailResults.length; index += 1) {
    const result = emailResults[index];
    const meta = emailJobMeta[index];
    store.deliveries.push({
      id: crypto.randomUUID(),
      announcementId: announcement.id,
      userId: meta.userId,
      channel: "email",
      status: result.sent ? "sent" : "failed",
      reason: result.sent ? undefined : result.reason || "email_send_failed",
      createdAt: nowIso()
    });
  }

  announcement.updatedAt = nowIso();
  announcement.updatedByUserId = input.actorUserId;

  await writeAnnouncementStore(store);

  return {
    recipients: recipients.length,
    queuedPushOrSms: store.deliveries.filter(
      (entry) =>
        entry.announcementId === announcement.id &&
        entry.status === "queued" &&
        (entry.channel === "push" || entry.channel === "sms")
    ).length,
    sentEmails: emailResults.filter((entry) => entry.sent).length,
    failedEmails: emailResults.filter((entry) => !entry.sent).length
  };
}
