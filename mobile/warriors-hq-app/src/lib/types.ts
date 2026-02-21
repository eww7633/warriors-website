export type ReservationStatus = 'going' | 'maybe' | 'not_going';

export type MobileUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'player' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  rosterId?: string;
  jerseyNumber?: number;
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
  goingMembers: Array<{
    userId: string;
    fullName: string;
    status: ReservationStatus;
    isManager: boolean;
    role: 'player' | 'admin' | null;
    requestedPosition: string | null;
  }>;
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
