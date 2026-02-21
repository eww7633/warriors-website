import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Linking from 'expo-linking';
import { GOOGLE_CALENDAR_SUBSCRIBE_URL, ICAL_FEED_URL } from '@/lib/env';
import type { MobileEvent } from '@/lib/types';

const ensureCalendarPermissions = async (): Promise<boolean> => {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  return permission.status === 'granted';
};

const getWritableCalendarId = async (): Promise<string | null> => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((calendar) => calendar.allowsModifications);

  if (writable) return writable.id;

  if (Platform.OS === 'ios') {
    const defaultCalendarSource = await Calendar.getDefaultCalendarAsync();
    const id = await Calendar.createCalendarAsync({
      title: 'Warriors HQ',
      color: '#D8A333',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.source.id,
      source: defaultCalendarSource.source,
      name: 'Warriors HQ',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER
    });

    return id;
  }

  return null;
};

export const addEventToCalendar = async (event: MobileEvent): Promise<void> => {
  const permitted = await ensureCalendarPermissions();
  if (!permitted) {
    throw new Error('Calendar permission is required to add events.');
  }

  const calendarId = await getWritableCalendarId();
  if (!calendarId) {
    throw new Error('No writable calendar found.');
  }

  const startDate = new Date(event.startsAt);
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

  await Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate,
    endDate,
    location: event.location,
    notes: event.publicDetails || undefined,
    url: event.locationMapUrl || undefined
  });
};

export const openCalendarSubscription = async (): Promise<void> => {
  const target = GOOGLE_CALENDAR_SUBSCRIBE_URL || ICAL_FEED_URL;
  if (!target) {
    throw new Error('Calendar subscription link is not configured.');
  }
  await Linking.openURL(target);
};
