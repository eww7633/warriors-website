import { API_BASE_URL } from '@/lib/env';
import type { DashboardSummary, MobileEvent, MobileUser, ReservationStatus } from '@/lib/types';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;
const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeUser = (raw: Record<string, unknown>): MobileUser => ({
  id: String(raw.id ?? ''),
  fullName: String(raw.fullName ?? raw.name ?? 'User'),
  email: String(raw.email ?? ''),
  role: (raw.role as MobileUser['role']) ?? 'player',
  status: (raw.status as MobileUser['status']) ?? 'approved',
  rosterId: raw.rosterId ? String(raw.rosterId) : undefined,
  jerseyNumber: toNullableNumber(raw.jerseyNumber ?? raw.sweaterNumber ?? raw.number) ?? undefined,
  avatarUrl: raw.avatarUrl
    ? String(raw.avatarUrl)
    : raw.photoUrl
      ? String(raw.photoUrl)
      : raw.profileImageUrl
        ? String(raw.profileImageUrl)
        : null,
  lockerRoomAssignment: raw.lockerRoomAssignment ? String(raw.lockerRoomAssignment) : null
});

const networkErrorMessage = () =>
  `Unable to reach API at ${API_BASE_URL}. Start backend (npm run dev) or update EXPO_PUBLIC_API_BASE_URL.`;

const parseErrorPayload = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error || data.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const normalizeEvent = (raw: Record<string, unknown>): MobileEvent => {
  const reservationBoard = Array.isArray(raw.reservationBoard)
    ? (raw.reservationBoard as Array<Record<string, unknown>>)
    : [];

  const goingMembers = reservationBoard
    .filter((entry) => String(entry.status ?? '') === 'going')
    .map((entry) => ({
      userId: String(entry.userId ?? ''),
      fullName: String(entry.fullName ?? 'Player'),
      status: 'going' as ReservationStatus,
      isManager: Boolean(entry.isManager),
      role: (entry.role as 'player' | 'admin' | null) ?? null,
      requestedPosition: entry.requestedPosition ? String(entry.requestedPosition) : null,
      jerseyNumber: toNullableNumber(
        entry.jerseyNumber ?? entry.sweaterNumber ?? entry.number ?? entry.playerNumber ?? entry.rosterNumber
      ),
      avatarUrl: entry.avatarUrl
        ? String(entry.avatarUrl)
        : entry.photoUrl
          ? String(entry.photoUrl)
          : entry.profileImageUrl
            ? String(entry.profileImageUrl)
            : null
    }));

  return {
    id: String(raw.id),
    title: String(raw.title ?? 'Untitled Event'),
    startsAt: String(raw.date ?? raw.startsAt ?? new Date().toISOString()),
    publicDetails: String(raw.publicDetails ?? ''),
    location: String(raw.locationPublic ?? raw.location ?? 'Location TBD'),
    locationMapUrl: raw.locationPublicMapUrl ? String(raw.locationPublicMapUrl) : null,
    eventType: String(raw.eventTypeName ?? raw.eventType ?? 'General'),
    viewerReservationStatus: (raw.viewerReservationStatus as ReservationStatus | null) ?? null,
    reservationCount: Number(raw.reservationCount ?? 0),
    goingCount: Number(raw.goingCount ?? goingMembers.length),
    canManage: Boolean(raw.canManage),
    signupMode: (raw.signupMode as 'straight_rsvp' | 'interest_gathering') ?? 'straight_rsvp',
    signupClosed: Boolean(raw.signupClosed),
    goingMembers
  };
};

const postForm = async (path: string, body: Record<string, string>): Promise<Response> => {
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => form.append(key, value));

  try {
    return await fetch(buildUrl(path), {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json, text/html;q=0.9' }
    });
  } catch {
    throw new Error(networkErrorMessage());
  }
};

const authorized = async (path: string, token: string, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(buildUrl(path), {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error(networkErrorMessage());
  }
};

export const apiClient = {
  apiBaseUrl: API_BASE_URL,

  async login(email: string, password: string): Promise<{ token: string; user: MobileUser }> {
    let response: Response;
    try {
      response = await fetch(buildUrl('/api/mobile/auth/login'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch {
      throw new Error(networkErrorMessage());
    }

    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { token: string; user: MobileUser };
    return {
      token: payload.token,
      user: normalizeUser(payload.user as unknown as Record<string, unknown>)
    };
  },

  async register(input: { fullName: string; email: string; password: string; phone?: string; position?: string }): Promise<void> {
    const response = await postForm('/api/auth/register', {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone ?? '',
      position: input.position ?? ''
    });

    if (!response.ok && response.status >= 400) {
      throw new Error(`Registration failed (${response.status})`);
    }
  },

  async logout(token: string): Promise<void> {
    const response = await authorized('/api/mobile/auth/logout', token, { method: 'POST' });
    if (!response.ok && response.status !== 401) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async getDashboard(token: string): Promise<DashboardSummary> {
    const response = await authorized('/api/mobile/dashboard', token);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as DashboardSummary & { user?: Record<string, unknown> };
    return {
      ...payload,
      user: payload.user ? normalizeUser(payload.user) : payload.user
    } as DashboardSummary;
  },

  async getEvents(token: string): Promise<MobileEvent[]> {
    const response = await authorized('/api/mobile/events', token);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { events: Array<Record<string, unknown>> };
    return (payload.events || []).map(normalizeEvent);
  },

  async getEventDetail(token: string, eventId: string): Promise<MobileEvent> {
    const events = await this.getEvents(token);
    const event = events.find((entry) => entry.id === eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    return event;
  },

  async setRsvp(token: string, eventId: string, status: ReservationStatus): Promise<void> {
    const response = await authorized('/api/mobile/events/reservation', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId, status, note: '' })
    });

    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async submitQrCheckIn(token: string, qrToken: string): Promise<void> {
    const response = await authorized('/api/mobile/checkin', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: qrToken })
    });

    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async uploadProfilePhoto(token: string, uri: string): Promise<MobileUser> {
    const form = new FormData();
    const fileName = uri.split('/').pop() || 'profile.jpg';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    form.append('photo', { uri, name: fileName, type: mimeType } as unknown as Blob);

    const tryUpload = async (path: string) =>
      authorized(path, token, {
        method: 'POST',
        body: form
      });

    let response = await tryUpload('/api/mobile/profile/photo');
    if (response.status === 404 || response.status === 405) {
      response = await tryUpload('/api/mobile/profile/avatar');
    }

    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { user?: Record<string, unknown> };
    if (!payload.user) {
      throw new Error('Profile photo uploaded, but user payload is missing.');
    }
    return normalizeUser(payload.user);
  }
};
