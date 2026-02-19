export type PublicEvent = {
  id: string;
  title: string;
  startsAt: string;
  publicDetails: string;
  location: string;
  locationMapUrl: string | null;
  eventType: string;
  eventUrl: string;
  loginUrl: string;
  registerUrl: string;
};

export type DashboardSummary = {
  fullName: string;
  email: string;
  role: 'player' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  rosterId: string | null;
  jerseyNumber: string | null;
  recentCheckIns: Array<{
    id: string;
    eventTitle: string;
    attendanceStatus: string;
    checkedInAt: string | null;
  }>;
};

export type EventDetail = PublicEvent & {
  userReservationStatus?: 'going' | 'maybe' | 'not_going' | null;
};
