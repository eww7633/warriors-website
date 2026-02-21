export type ReservationStatus = 'going' | 'maybe' | 'not_going';
export type ThemeMode = 'system' | 'light' | 'dark';

export type MobileUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'player' | 'admin' | 'supporter';
  status: 'pending' | 'approved' | 'rejected';
  rosterId?: string;
  jerseyNumber?: number;
  avatarUrl?: string | null;
  lockerRoomAssignment?: string | null;
  phone?: string | null;
  position?: string | null;
  pronouns?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  jerseyRequest?: string | null;
  usaHockeyNumber?: string | null;
  sharePhone?: boolean;
  shareEmail?: boolean;
  shareAddress?: boolean;
};

export type SessionState = {
  isAuthenticated: boolean;
  token: string | null;
  user: MobileUser | null;
};

export type MobileEvent = {
  id: string;
  title: string;
  startsAt: string;
  publicDetails: string;
  location: string;
  locationMapUrl: string | null;
  eventType: string;
  viewerReservationStatus: ReservationStatus | null;
  reservationCount: number;
  goingCount: number;
  canManage: boolean;
  signupMode: 'straight_rsvp' | 'interest_gathering';
  signupClosed: boolean;
  isOnIceEvent: boolean;
  viewerCanRsvp: boolean;
  viewerNeedsApproval: boolean;
  viewerRosteredTeam: string | null;
  teamLabel: string | null;
  goingMembers: Array<{
    userId: string;
    fullName: string;
    status: ReservationStatus;
    isManager: boolean;
    role: 'player' | 'admin' | null;
    requestedPosition: string | null;
    jerseyNumber: number | null;
    avatarUrl: string | null;
  }>;
};

export type MobileAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdByName: string | null;
  pinned: boolean;
  expiresAt: string | null;
  audience: 'all' | 'players' | 'supporters' | 'admins';
};

export type DashboardSummary = {
  user: MobileUser;
  stats: {
    pendingRegistrations: number;
    approvedPlayers: number;
    recentCheckIns: number;
    visibleEvents: number;
  };
};

export type RsvpApprovalRequest = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail: string | null;
  requestedByRole: 'player' | 'supporter' | 'admin' | null;
  requestedAt: string;
  note: string | null;
  status: 'pending' | 'approved' | 'denied';
  teamLabel: string | null;
};

export type MobileRosterMember = {
  userId: string;
  fullName: string;
  role: 'player' | 'supporter' | 'admin';
  teamLabel: string | null;
  position: string | null;
  jerseyNumber: number | null;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  sharePhone: boolean;
  shareEmail: boolean;
  shareAddress: boolean;
  canViewPrivate: boolean;
  status: 'pending' | 'approved' | 'rejected';
};
