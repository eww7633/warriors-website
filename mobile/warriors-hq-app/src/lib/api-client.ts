import { API_BASE_URL } from '@/lib/env';
import { offlineCache } from '@/lib/offline-cache';
import type {
  DashboardSummary,
  MobileAnnouncement,
  MobileEvent,
  MobileRosterMember,
  MobileUser,
  ReservationStatus,
  RsvpApprovalRequest
} from '@/lib/types';

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

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
  lockerRoomAssignment: raw.lockerRoomAssignment ? String(raw.lockerRoomAssignment) : null,
  phone: raw.phone ? String(raw.phone) : null,
  position: raw.position ? String(raw.position) : null,
  pronouns: raw.pronouns ? String(raw.pronouns) : null,
  emergencyContactName: raw.emergencyContactName ? String(raw.emergencyContactName) : null,
  emergencyContactPhone: raw.emergencyContactPhone ? String(raw.emergencyContactPhone) : null,
  jerseyRequest: raw.jerseyRequest ? String(raw.jerseyRequest) : null,
  usaHockeyNumber: raw.usaHockeyNumber ? String(raw.usaHockeyNumber) : null,
  sharePhone: Boolean(raw.sharePhone ?? raw.phoneVisibleToTeam),
  shareEmail: Boolean(raw.shareEmail ?? raw.emailVisibleToTeam),
  shareAddress: Boolean(raw.shareAddress ?? raw.addressVisibleToTeam)
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
    isOnIceEvent: Boolean(raw.isOnIceEvent ?? raw.onIceEvent ?? raw.eventCategory === 'on_ice'),
    viewerCanRsvp: Boolean(raw.viewerCanRsvp ?? raw.canRsvp ?? true),
    viewerNeedsApproval: Boolean(raw.viewerNeedsApproval ?? raw.rsvpNeedsApproval ?? false),
    viewerRosteredTeam: raw.viewerRosteredTeam ? String(raw.viewerRosteredTeam) : null,
    teamLabel: raw.teamLabel ? String(raw.teamLabel) : raw.teamName ? String(raw.teamName) : null,
    goingMembers
  };
};

const normalizeAnnouncement = (raw: Record<string, unknown>): MobileAnnouncement => ({
  id: String(raw.id ?? raw.slug ?? ''),
  title: String(raw.title ?? 'Announcement'),
  body: String(raw.body ?? raw.message ?? ''),
  createdAt: String(raw.createdAt ?? raw.date ?? new Date().toISOString()),
  createdByName: raw.createdByName ? String(raw.createdByName) : raw.authorName ? String(raw.authorName) : null,
  pinned: Boolean(raw.pinned),
  expiresAt: raw.expiresAt ? String(raw.expiresAt) : null,
  audience: (raw.audience as MobileAnnouncement['audience']) ?? 'all'
});

const normalizeApprovalRequest = (raw: Record<string, unknown>): RsvpApprovalRequest => ({
  id: String(raw.id ?? raw.requestId ?? ''),
  eventId: String(raw.eventId ?? ''),
  eventTitle: String(raw.eventTitle ?? raw.title ?? 'Event'),
  eventStartsAt: String(raw.eventStartsAt ?? raw.startsAt ?? raw.date ?? new Date().toISOString()),
  requestedByUserId: String(raw.requestedByUserId ?? raw.userId ?? ''),
  requestedByName: String(raw.requestedByName ?? raw.fullName ?? 'Unknown User'),
  requestedByEmail: raw.requestedByEmail ? String(raw.requestedByEmail) : null,
  requestedByRole: (raw.requestedByRole as RsvpApprovalRequest['requestedByRole']) ?? null,
  requestedAt: String(raw.requestedAt ?? raw.createdAt ?? new Date().toISOString()),
  note: raw.note ? String(raw.note) : null,
  status: (raw.status as RsvpApprovalRequest['status']) ?? 'pending',
  teamLabel: raw.teamLabel ? String(raw.teamLabel) : null
});

const normalizeRosterMember = (raw: Record<string, unknown>): MobileRosterMember => ({
  userId: String(raw.userId ?? raw.id ?? ''),
  fullName: String(raw.fullName ?? raw.name ?? 'Unknown Member'),
  role: (raw.role as MobileRosterMember['role']) ?? 'player',
  teamLabel: raw.teamLabel ? String(raw.teamLabel) : raw.teamName ? String(raw.teamName) : null,
  position: raw.position ? String(raw.position) : null,
  jerseyNumber: toNullableNumber(raw.jerseyNumber ?? raw.number ?? raw.sweaterNumber),
  avatarUrl: raw.avatarUrl
    ? String(raw.avatarUrl)
    : raw.photoUrl
      ? String(raw.photoUrl)
      : raw.profileImageUrl
        ? String(raw.profileImageUrl)
        : null,
  phone: raw.phone ? String(raw.phone) : null,
  email: raw.email ? String(raw.email) : null,
  address: raw.address ? String(raw.address) : null,
  sharePhone: Boolean(raw.sharePhone ?? raw.phoneVisibleToTeam),
  shareEmail: Boolean(raw.shareEmail ?? raw.emailVisibleToTeam),
  shareAddress: Boolean(raw.shareAddress ?? raw.addressVisibleToTeam),
  canViewPrivate: Boolean(raw.canViewPrivate),
  status: (raw.status as MobileRosterMember['status']) ?? 'approved'
});

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

const throwIfUnauthorized = async (response: Response): Promise<void> => {
  if (response.status === 401) {
    const message = await parseErrorPayload(response);
    throw new SessionExpiredError(message);
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
    await throwIfUnauthorized(response);
    if (!response.ok && response.status !== 401) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async registerPushToken(token: string, pushToken: string): Promise<void> {
    let response = await authorized('/api/mobile/push/register', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pushToken })
    });

    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/mobile/notifications/register', token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pushToken })
      });
    }

    await throwIfUnauthorized(response);
    if (!response.ok && response.status !== 404 && response.status !== 405) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async getDashboard(token: string): Promise<DashboardSummary> {
    const response = await authorized('/api/mobile/dashboard', token);
    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as DashboardSummary & { user?: Record<string, unknown> };
    return {
      ...payload,
      user: payload.user ? normalizeUser(payload.user) : payload.user
    } as DashboardSummary;
  },

  async getProfile(token: string): Promise<MobileUser> {
    let response = await authorized('/api/mobile/profile', token);
    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/mobile/me', token);
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { user?: Record<string, unknown> } | Record<string, unknown>;
    const raw = 'user' in payload ? payload.user : payload;
    if (!raw) {
      throw new Error('Profile unavailable');
    }
    return normalizeUser(raw as Record<string, unknown>);
  },

  async updateProfile(
    token: string,
    input: Partial<
      Pick<
        MobileUser,
        | 'phone'
        | 'position'
        | 'pronouns'
        | 'emergencyContactName'
        | 'emergencyContactPhone'
        | 'jerseyRequest'
        | 'usaHockeyNumber'
        | 'sharePhone'
        | 'shareEmail'
        | 'shareAddress'
      >
    >
  ): Promise<MobileUser> {
    let response = await authorized('/api/mobile/profile', token, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/account/profile', token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { user?: Record<string, unknown> } | Record<string, unknown>;
    const raw = 'user' in payload ? payload.user : payload;
    if (!raw) {
      throw new Error('Profile saved, but user payload is missing.');
    }
    return normalizeUser(raw as Record<string, unknown>);
  },

  async getEvents(token: string): Promise<MobileEvent[]> {
    try {
      const response = await authorized('/api/mobile/events', token);
      await throwIfUnauthorized(response);
      if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
      }

      const payload = (await response.json()) as { events: Array<Record<string, unknown>> };
      const events = (payload.events || []).map(normalizeEvent);
      await offlineCache.saveEvents(events);
      return events;
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;
      const cached = await offlineCache.loadEvents<MobileEvent[]>();
      if (cached?.length) {
        return cached;
      }
      throw error;
    }
  },

  async getEventDetail(token: string, eventId: string): Promise<MobileEvent> {
    let response = await authorized(`/api/mobile/events/${eventId}`, token);
    if (response.status === 404 || response.status === 405) {
      const events = await this.getEvents(token);
      const event = events.find((entry) => entry.id === eventId);
      if (!event) throw new Error('Event not found');
      return event;
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { event?: Record<string, unknown> } | Record<string, unknown>;
    const raw = 'event' in payload ? payload.event : payload;
    if (!raw) throw new Error('Event not found');
    return normalizeEvent(raw as Record<string, unknown>);
  },

  async setRsvp(token: string, eventId: string, status: ReservationStatus, note = ''): Promise<void> {
    const response = await authorized('/api/mobile/events/reservation', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId, status, note })
    });

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async requestRsvpApproval(token: string, eventId: string): Promise<void> {
    let response = await authorized('/api/mobile/events/reservation/request', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId, request: true })
    });

    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/mobile/events/reservation', token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId, status: 'maybe', note: 'REQUEST_APPROVAL' })
      });
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }
  },

  async getRsvpApprovalQueue(token: string): Promise<RsvpApprovalRequest[]> {
    let response = await authorized('/api/mobile/admin/rsvp-approvals', token);
    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/admin/events/rsvp-approvals', token);
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as {
      requests?: Array<Record<string, unknown>>;
      approvals?: Array<Record<string, unknown>>;
      items?: Array<Record<string, unknown>>;
    };

    const items = payload.requests ?? payload.approvals ?? payload.items ?? [];
    return items.map(normalizeApprovalRequest);
  },

  async getRoster(token: string, includePrivate = false): Promise<MobileRosterMember[]> {
    const query = includePrivate ? '?includePrivate=1' : '';
    let response = await authorized(`/api/mobile/roster${query}`, token);
    if (response.status === 404 || response.status === 405) {
      response = await authorized(`/api/admin/roster${query}`, token);
    }
    if ((response.status === 404 || response.status === 405) && !includePrivate) {
      response = await authorized('/api/public/roster', token);
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as {
      roster?: Array<Record<string, unknown>>;
      members?: Array<Record<string, unknown>>;
      items?: Array<Record<string, unknown>>;
    };

    const items = payload.roster ?? payload.members ?? payload.items ?? [];
    return items.map(normalizeRosterMember);
  },

  async resolveRsvpApproval(token: string, requestId: string, decision: 'approved' | 'denied'): Promise<void> {
    let response = await authorized(`/api/mobile/admin/rsvp-approvals/${requestId}`, token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision })
    });

    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/admin/events/rsvp-approvals/resolve', token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, decision })
      });
    }

    await throwIfUnauthorized(response);
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

    await throwIfUnauthorized(response);
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

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }

    const payload = (await response.json()) as { user?: Record<string, unknown> };
    if (!payload.user) {
      throw new Error('Profile photo uploaded, but user payload is missing.');
    }
    return normalizeUser(payload.user);
  },

  async getAnnouncements(token: string): Promise<MobileAnnouncement[]> {
    try {
      let response = await authorized('/api/mobile/announcements', token);
      if (response.status === 404 || response.status === 405) {
        response = await authorized('/api/public/announcements', token);
      }

      await throwIfUnauthorized(response);
      if (!response.ok) {
        throw new Error(await parseErrorPayload(response));
      }

      const payload = (await response.json()) as {
        announcements?: Array<Record<string, unknown>>;
        items?: Array<Record<string, unknown>>;
      };
      const items = payload.announcements ?? payload.items ?? [];
      const announcements = items.map(normalizeAnnouncement);
      await offlineCache.saveAnnouncements(announcements);
      return announcements;
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;
      const cached = await offlineCache.loadAnnouncements<MobileAnnouncement[]>();
      if (cached?.length) {
        return cached;
      }
      throw error;
    }
  },

  async createAnnouncement(
    token: string,
    input: {
      title: string;
      body: string;
      pinned?: boolean;
      audience?: 'all' | 'players' | 'supporters' | 'admins';
      expiresAt?: string | null;
    }
  ): Promise<void> {
    let response = await authorized('/api/mobile/announcements', token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (response.status === 404 || response.status === 405) {
      response = await authorized('/api/admin/announcements', token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
    }

    await throwIfUnauthorized(response);
    if (!response.ok) {
      throw new Error(await parseErrorPayload(response));
    }
  }
};
