import { FEATURE_FLAGS_URL } from '@/lib/env';

export type FeatureFlags = {
  analytics: boolean;
  notifications: boolean;
  eventReminders: boolean;
  announcementAlerts: boolean;
  sentry: boolean;
};

const defaults: FeatureFlags = {
  analytics: true,
  notifications: true,
  eventReminders: true,
  announcementAlerts: true,
  sentry: true
};

let cached = defaults;
let hydrated = false;

const fromEnv = (): Partial<FeatureFlags> => {
  const read = (key: string): boolean | undefined => {
    const value = process.env[key];
    if (!value) return undefined;
    return value === '1' || value.toLowerCase() === 'true';
  };

  return {
    analytics: read('EXPO_PUBLIC_FLAG_ANALYTICS'),
    notifications: read('EXPO_PUBLIC_FLAG_NOTIFICATIONS'),
    eventReminders: read('EXPO_PUBLIC_FLAG_EVENT_REMINDERS'),
    announcementAlerts: read('EXPO_PUBLIC_FLAG_ANNOUNCEMENT_ALERTS'),
    sentry: read('EXPO_PUBLIC_FLAG_SENTRY')
  };
};

const withDefaults = (input?: Partial<FeatureFlags>): FeatureFlags => ({
  ...defaults,
  ...fromEnv(),
  ...(input || {})
});

export const getFeatureFlags = (): FeatureFlags => cached;

export const hydrateFeatureFlags = async (): Promise<FeatureFlags> => {
  if (hydrated) return cached;
  hydrated = true;

  cached = withDefaults();
  if (!FEATURE_FLAGS_URL) return cached;

  try {
    const response = await fetch(FEATURE_FLAGS_URL);
    if (!response.ok) return cached;
    const payload = (await response.json()) as Partial<FeatureFlags>;
    cached = withDefaults(payload);
    return cached;
  } catch {
    return cached;
  }
};
