export type Role = "public" | "player" | "admin";

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
