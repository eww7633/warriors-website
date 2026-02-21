import { API_BASE_URL } from '@/lib/env';
import { getFeatureFlags } from '@/lib/feature-flags';

type EventProps = Record<string, string | number | boolean | null | undefined>;

export const analytics = {
  async track(event: string, props: EventProps = {}, token?: string | null): Promise<void> {
    if (!getFeatureFlags().analytics) return;

    try {
      await fetch(`${API_BASE_URL}/api/mobile/analytics/event`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          event,
          props,
          at: new Date().toISOString()
        })
      });
    } catch {
      // Analytics should never break the UX.
    }
  }
};
