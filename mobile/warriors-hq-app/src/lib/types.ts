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
