import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
  apiBaseUrl?: string;
  icalFeedUrl?: string;
  googleCalendarSubscribeUrl?: string;
} | undefined;
const candidate = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl ?? '';

// Keep host consistent with backend redirects/cookie scope during local simulator runs.
// Prefer localhost unless the user explicitly switches to a LAN IP.
export const API_BASE_URL = candidate.replace(/\/$/, '') || 'http://localhost:3000';
export const ICAL_FEED_URL = process.env.EXPO_PUBLIC_ICAL_FEED_URL ?? extra?.icalFeedUrl ?? '';
export const GOOGLE_CALENDAR_SUBSCRIBE_URL =
  process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_SUBSCRIBE_URL ?? extra?.googleCalendarSubscribeUrl ?? '';
