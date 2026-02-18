export type Role = "public" | "player" | "admin";
export type UserStatus = "pending" | "approved" | "rejected";

export type EventItem = {
  id: string;
  title: string;
  date: string;
  publicDetails: string;
  privateDetails: string;
  isPlayerOnly: boolean;
};

export type Player = {
  id: string;
  name: string;
  position: string;
  status: "Active" | "Injured" | "Inactive";
  gamesPlayed: number;
  goals: number;
  assists: number;
};

export type NewsItem = {
  id: string;
  title: string;
  date: string;
  summary: string;
};

export type Season = {
  id: string;
  label: string;
  isActive: boolean;
  level: "Travel" | "League" | "Development";
};

export type TeamRoster = {
  id: string;
  seasonId: string;
  name: string;
  division: string;
  playerIds: string[];
};

export type GameEvent = {
  time: string;
  team: "Warriors" | "Opponent";
  type: "goal" | "penalty" | "shot";
  note: string;
};

export type Game = {
  id: string;
  seasonId: string;
  rosterId: string;
  startsAt: string;
  opponent: string;
  location: string;
  status: "scheduled" | "live" | "final";
  warriorsScore: number;
  opponentScore: number;
  events: GameEvent[];
};

export type EquipmentSizes = {
  helmet?: string;
  gloves?: string;
  skates?: string;
  pants?: string;
  stick?: string;
  jersey?: string;
  shell?: string;
  warmupTop?: string;
  warmupBottom?: string;
};

export type MemberUser = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  requestedPosition?: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  rosterId?: string;
  jerseyNumber?: number;
  equipmentSizes: EquipmentSizes;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  expiresAt: string;
};

export type CheckInRecord = {
  id: string;
  userId: string;
  eventId: string;
  checkedInAt?: string;
  arrivedAt?: string;
  attendanceStatus: "checked_in_attended" | "checked_in_no_show" | "walk_in_attended" | "absent";
  note?: string;
};

export type HQStore = {
  users: MemberUser[];
  sessions: SessionRecord[];
  checkIns: CheckInRecord[];
};
