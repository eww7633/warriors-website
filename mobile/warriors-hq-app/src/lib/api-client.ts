import { API_BASE_URL } from '@/lib/env';
import type { ApiError, DashboardSummary, EventDetail, PublicEvent, PublicEventsResponse } from '@/lib/types';

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
};

const asError = (error: unknown, fallback: string): ApiError => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return { message: error.message };
  }
  return { message: fallback };
};

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

const postForm = async (path: string, body: Record<string, string>): Promise<Response> => {
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    form.append(key, value);
  });

  return fetch(buildUrl(path), {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: {
      Accept: 'application/json, text/html;q=0.9'
    }
  });
};

const extractUrlError = (url: string): string | null => {
  const maybeUrl = new URL(url);
  const raw = maybeUrl.searchParams.get('error');
  return raw ? decodeURIComponent(raw).replaceAll('_', ' ') : null;
};

export const apiClient = {
  apiBaseUrl: API_BASE_URL,

  async login(email: string, password: string): Promise<void> {
    const response = await postForm('/api/auth/login', { email, password });
    const currentUrl = response.url || '';

    if (!response.ok && !currentUrl) {
      throw new Error('Login failed.');
    }

    const redirectError = currentUrl ? extractUrlError(currentUrl) : null;
    if (redirectError) {
      throw new Error(redirectError);
    }

    if (!currentUrl.includes('/player') && !currentUrl.includes('/admin')) {
      throw new Error('Login did not complete. Check API base URL and credentials.');
    }
  },

  async register(input: RegisterInput): Promise<void> {
    const response = await postForm('/api/auth/register', {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone ?? '',
      position: input.position ?? ''
    });

    const currentUrl = response.url || '';
    const redirectError = currentUrl ? extractUrlError(currentUrl) : null;
    if (redirectError) {
      throw new Error(redirectError);
    }

    if (!currentUrl.includes('/login?registered=1')) {
      throw new Error('Registration request failed.');
    }
  },

  async logout(): Promise<void> {
    await postForm('/api/auth/logout', {});
  },

  async getDashboard(): Promise<DashboardSummary> {
    try {
      const response = await fetch(buildUrl('/api/mobile/player/dashboard'), {
        credentials: 'include'
      });

      if (response.status === 404) {
        throw new Error('Dashboard API missing on backend.');
      }

      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status}).`);
      }

      return (await response.json()) as DashboardSummary;
    } catch (error) {
      throw asError(error, 'Unable to load player dashboard.');
    }
  },

  async getEvents(): Promise<PublicEvent[]> {
    const response = await fetch(buildUrl('/api/public/events'), { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Unable to load events (${response.status}).`);
    }

    const payload = (await response.json()) as PublicEventsResponse;
    return payload.items;
  },

  async getEventDetail(eventId: string): Promise<EventDetail> {
    try {
      const response = await fetch(buildUrl(`/api/mobile/events/${encodeURIComponent(eventId)}`), {
        credentials: 'include'
      });

      if (response.status === 404) {
        const events = await this.getEvents();
        const matched = events.find((event) => event.id === eventId);
        if (!matched) {
          throw new Error('Event not found.');
        }

        return {
          ...matched,
          userReservationStatus: null
        };
      }

      if (!response.ok) {
        throw new Error(`Unable to load event detail (${response.status}).`);
      }

      return (await response.json()) as EventDetail;
    } catch (error) {
      throw asError(error, 'Unable to load event detail.');
    }
  },

  async setRsvp(eventId: string, status: 'going' | 'maybe' | 'not_going', note = ''): Promise<void> {
    try {
      const response = await fetch(buildUrl(`/api/mobile/events/${encodeURIComponent(eventId)}/rsvp`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ status, note })
      });

      if (response.status === 404) {
        const mappedStatus = status === 'not_going' ? 'declined' : status;
        const legacy = await postForm('/api/events/reservation', {
          eventId,
          status: mappedStatus,
          note
        });
        const redirectError = legacy.url ? extractUrlError(legacy.url) : null;
        if (redirectError) {
          throw new Error(redirectError);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`RSVP failed (${response.status}).`);
      }
    } catch (error) {
      throw asError(error, 'Unable to save RSVP.');
    }
  },

  async submitQrCheckIn(token: string): Promise<void> {
    try {
      const response = await fetch(buildUrl('/api/mobile/checkin/scan'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (response.status === 404) {
        const legacy = await postForm('/api/events/checkin/scan', { token });
        const redirectError = legacy.url ? extractUrlError(legacy.url) : null;
        if (redirectError) {
          throw new Error(redirectError);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Check-in failed (${response.status}).`);
      }
    } catch (error) {
      throw asError(error, 'Unable to complete check-in scan.');
    }
  }
};
