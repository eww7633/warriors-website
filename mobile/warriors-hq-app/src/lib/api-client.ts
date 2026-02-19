import { API_BASE_URL } from '@/lib/env';
import type { DashboardSummary, EventDetail, PublicEvent } from '@/lib/types';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

const postForm = async (path: string, body: Record<string, string>): Promise<Response> => {
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => form.append(key, value));
  return fetch(buildUrl(path), {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: { Accept: 'application/json, text/html;q=0.9' }
  });
};

const extractUrlError = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const value = parsed.searchParams.get('error');
    return value ? decodeURIComponent(value).replaceAll('_', ' ') : null;
  } catch {
    return null;
  }
};

export const apiClient = {
  apiBaseUrl: API_BASE_URL,

  async login(email: string, password: string): Promise<void> {
    const response = await postForm('/api/auth/login', { email, password });
    const err = extractUrlError(response.url || '');
    if (err) throw new Error(err);
    if (!response.url.includes('/player') && !response.url.includes('/admin')) {
      throw new Error('Login failed.');
    }
  },

  async register(input: { fullName: string; email: string; password: string; phone?: string; position?: string }): Promise<void> {
    const response = await postForm('/api/auth/register', {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone ?? '',
      position: input.position ?? ''
    });
    const err = extractUrlError(response.url || '');
    if (err) throw new Error(err);
  },

  async logout(): Promise<void> {
    await postForm('/api/auth/logout', {});
  },

  async getDashboard(): Promise<DashboardSummary> {
    const response = await fetch(buildUrl('/api/mobile/player/dashboard'), { credentials: 'include' });
    if (!response.ok) throw new Error(`Dashboard unavailable (${response.status})`);
    return (await response.json()) as DashboardSummary;
  },

  async getEvents(): Promise<PublicEvent[]> {
    const response = await fetch(buildUrl('/api/public/events'), { credentials: 'include' });
    if (!response.ok) throw new Error(`Events unavailable (${response.status})`);
    const payload = (await response.json()) as { items: PublicEvent[] };
    return payload.items;
  },

  async getEventDetail(eventId: string): Promise<EventDetail> {
    const mobile = await fetch(buildUrl(`/api/mobile/events/${encodeURIComponent(eventId)}`), { credentials: 'include' });
    if (mobile.ok) return (await mobile.json()) as EventDetail;
    const events = await this.getEvents();
    const event = events.find((item) => item.id === eventId);
    if (!event) throw new Error('Event not found');
    return { ...event, userReservationStatus: null };
  },

  async setRsvp(eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<void> {
    const mobile = await fetch(buildUrl(`/api/mobile/events/${encodeURIComponent(eventId)}/rsvp`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (mobile.ok) return;

    const mappedStatus = status === 'not_going' ? 'declined' : status;
    const legacy = await postForm('/api/events/reservation', { eventId, status: mappedStatus, note: '' });
    const err = extractUrlError(legacy.url || '');
    if (err) throw new Error(err);
  },

  async submitQrCheckIn(token: string): Promise<void> {
    const mobile = await fetch(buildUrl('/api/mobile/checkin/scan'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (mobile.ok) return;

    const legacy = await postForm('/api/events/checkin/scan', { token });
    const err = extractUrlError(legacy.url || '');
    if (err) throw new Error(err);
  }
};
