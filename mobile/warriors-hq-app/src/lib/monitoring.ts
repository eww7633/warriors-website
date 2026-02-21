import { SENTRY_DSN } from '@/lib/env';
import { getFeatureFlags } from '@/lib/feature-flags';
import * as Sentry from '@sentry/react-native';

let initialized = false;

export const initMonitoring = async (): Promise<void> => {
  if (initialized || !SENTRY_DSN || !getFeatureFlags().sentry) return;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: true,
      debug: false
    });
    initialized = true;
  } catch {
    // If Sentry SDK is unavailable, app continues without crash tracking.
  }
};

export const captureException = async (error: unknown, context?: Record<string, unknown>): Promise<void> => {
  try {
    Sentry.captureException(error, {
      extra: context
    });
  } catch {
    // No-op fallback.
  }
};
