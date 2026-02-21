import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getFeatureFlags } from '@/lib/feature-flags';
import type { MobileAnnouncement, MobileEvent } from '@/lib/types';

const EVENT_REMINDER_KEY = 'hq_mobile_scheduled_event_reminders_v1';
const ANNOUNCEMENT_ALERT_KEY = 'hq_mobile_seen_announcements_v1';

const loadSet = async (key: string): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    return new Set((JSON.parse(raw) as string[]) || []);
  } catch {
    return new Set();
  }
};

const saveSet = async (key: string, values: Set<string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // Ignore storage errors.
  }
};

export const scheduleEventReminders = async (events: MobileEvent[]): Promise<void> => {
  const flags = getFeatureFlags();
  if (!flags.notifications || !flags.eventReminders) return;

  const scheduled = await loadSet(EVENT_REMINDER_KEY);
  const now = Date.now();

  for (const event of events) {
    const startsAt = new Date(event.startsAt).getTime();
    const reminderAt = startsAt - 2 * 60 * 60 * 1000;
    const id = `event:${event.id}:${startsAt}`;

    if (scheduled.has(id)) continue;
    if (reminderAt <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event Reminder',
        body: `${event.title} starts at ${new Date(event.startsAt).toLocaleString()}.`
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminderAt) }
    });

    scheduled.add(id);
  }

  await saveSet(EVENT_REMINDER_KEY, scheduled);
};

export const scheduleAnnouncementAlerts = async (announcements: MobileAnnouncement[]): Promise<void> => {
  const flags = getFeatureFlags();
  if (!flags.notifications || !flags.announcementAlerts) return;

  const seen = await loadSet(ANNOUNCEMENT_ALERT_KEY);

  for (const item of announcements) {
    const id = `announcement:${item.id}`;
    if (seen.has(id)) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.pinned ? 'Pinned Announcement' : 'New Announcement',
        body: item.title
      },
      trigger: null
    });

    seen.add(id);
  }

  await saveSet(ANNOUNCEMENT_ALERT_KEY, seen);
};
