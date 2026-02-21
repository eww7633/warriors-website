import { NextResponse } from "next/server";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { NotificationCategory } from "@/lib/hq/notifications";
import { getNotificationPreference } from "@/lib/hq/notifications";
import {
  appendMobilePushDelivery,
  listPendingMobilePushTriggers,
  markMobilePushTriggerProcessed
} from "@/lib/hq/mobile-push";
import { listMobileDeviceTokensByUser } from "@/lib/hq/mobile-device-tokens";
import { sendMobilePush } from "@/lib/hq/mobile-push-provider";

function categoryForTrigger(
  type: "rsvp_updated" | "reminder_sent" | "announcement_sent" | "checkin_completed",
  payload?: Record<string, unknown>
): NotificationCategory {
  if (type === "announcement_sent") {
    const category = String(payload?.category ?? "").trim().toLowerCase();
    if (category === "dvhl") return "dvhl";
    if (category === "events") return "hockey";
    return "news";
  }
  if (type === "reminder_sent") {
    const category = String(payload?.category ?? "").trim().toLowerCase();
    if (category === "interest_roster_finalized") return "interest_roster_finalized";
    return "hockey";
  }
  return "hockey";
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") || "100", 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 100;
  const pending = await listPendingMobilePushTriggers(limit);

  let delivered = 0;
  let skipped = 0;
  let failed = 0;
  let queuedNoProvider = 0;

  for (const trigger of pending) {
    if (!trigger.targetUserId) {
      await appendMobilePushDelivery({
        triggerId: trigger.id,
        status: "skipped_pref_disabled",
        reason: "missing_target_user"
      });
      await markMobilePushTriggerProcessed({ triggerId: trigger.id, note: "missing_target_user" });
      skipped += 1;
      continue;
    }

    const pref = await getNotificationPreference(trigger.targetUserId);
    const category = categoryForTrigger(trigger.type, trigger.payload);
    if (!pref.channels.push || pref.frequency !== "immediate" || !pref.categories[category]) {
      await appendMobilePushDelivery({
        triggerId: trigger.id,
        targetUserId: trigger.targetUserId,
        status: "skipped_pref_disabled",
        reason: !pref.channels.push
          ? "push_channel_disabled"
          : pref.frequency !== "immediate"
          ? `frequency_${pref.frequency}`
          : `category_${category}_disabled`
      });
      await markMobilePushTriggerProcessed({ triggerId: trigger.id, note: "preference_filtered" });
      skipped += 1;
      continue;
    }

    const devices = await listMobileDeviceTokensByUser(trigger.targetUserId);
    if (devices.length === 0) {
      await appendMobilePushDelivery({
        triggerId: trigger.id,
        targetUserId: trigger.targetUserId,
        status: "skipped_pref_disabled",
        reason: "no_registered_device_tokens"
      });
      await markMobilePushTriggerProcessed({ triggerId: trigger.id, note: "no_device_tokens" });
      skipped += 1;
      continue;
    }

    for (const device of devices) {
      const result = await sendMobilePush({
        token: device.token,
        title: trigger.title,
        body: trigger.body,
        data: {
          triggerId: trigger.id,
          type: trigger.type,
          eventId: trigger.eventId || null,
          ...(trigger.payload || {})
        }
      });

      if (result.ok) {
        await appendMobilePushDelivery({
          triggerId: trigger.id,
          targetUserId: trigger.targetUserId,
          deviceToken: device.token,
          status: "delivered",
          providerResponseCode: result.status
        });
        delivered += 1;
      } else if (result.reason === "no_provider") {
        await appendMobilePushDelivery({
          triggerId: trigger.id,
          targetUserId: trigger.targetUserId,
          deviceToken: device.token,
          status: "queued_no_provider",
          reason: `${result.provider}:${result.reason}`
        });
        queuedNoProvider += 1;
      } else {
        await appendMobilePushDelivery({
          triggerId: trigger.id,
          targetUserId: trigger.targetUserId,
          deviceToken: device.token,
          status: "failed",
          providerResponseCode: result.status,
          reason: `${result.provider}:${result.reason}`
        });
        failed += 1;
      }
    }

    await markMobilePushTriggerProcessed({ triggerId: trigger.id, note: "processed" });
  }

  return NextResponse.json({
    ok: true,
    processedTriggers: pending.length,
    delivered,
    queuedNoProvider,
    skipped,
    failed
  });
}
