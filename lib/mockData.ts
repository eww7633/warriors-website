import { EventItem, Game, NewsItem, Player, Season, TeamRoster } from "@/lib/types";

export const events: EventItem[] = [
  {
    id: "event-1",
    title: "Community Learn-to-Play Clinic",
    date: "2026-03-12T18:30:00",
    publicDetails: "Open clinic and team meet-and-greet at Pittsburgh Ice Arena.",
    privateDetails: "Players arrive by 17:30, locker room B, wear red practice jersey.",
    isPlayerOnly: false
  },
  {
    id: "event-2",
    title: "Warriors Practice",
    date: "2026-03-15T20:00:00",
    publicDetails: "Team practice session.",
    privateDetails: "Video review at 19:00, systems work, mandatory check-in in app.",
    isPlayerOnly: true
  },
  {
    id: "event-3",
    title: "Veterans Appreciation Game",
    date: "2026-03-22T16:00:00",
    publicDetails: "Home game with ceremonial puck drop and post-game fundraiser.",
    privateDetails: "Players arrive by 14:30, dress code blazer and team tie.",
    isPlayerOnly: false
  }
];

export const roster: Player[] = [
  {
    id: "p-12",
    name: "Alex Mercer",
    position: "C",
    status: "Active",
    gamesPlayed: 14,
    goals: 9,
    assists: 11
  },
  {
    id: "p-29",
    name: "Jordan Blake",
    position: "G",
    status: "Active",
    gamesPlayed: 11,
    goals: 0,
    assists: 1
  },
  {
    id: "p-8",
    name: "Sam Rivera",
    position: "D",
    status: "Injured",
    gamesPlayed: 10,
    goals: 2,
    assists: 7
  }
];

export const seasons: Season[] = [
  { id: "s-2025-fall", label: "Fall 2025", isActive: false, level: "League" },
  { id: "s-2026-spring", label: "Spring 2026", isActive: true, level: "Travel" },
  { id: "s-2026-dev", label: "Development 2026", isActive: true, level: "Development" }
];

export const rosters: TeamRoster[] = [
  {
    id: "r-varsity-2026",
    seasonId: "s-2026-spring",
    name: "Warriors Varsity",
    division: "Adult Tier II",
    playerIds: ["p-12", "p-29", "p-8"]
  },
  {
    id: "r-dev-2026",
    seasonId: "s-2026-dev",
    name: "Warriors Development Squad",
    division: "Community Development",
    playerIds: ["p-12", "p-8"]
  }
];

export const games: Game[] = [
  {
    id: "g-1001",
    seasonId: "s-2026-spring",
    rosterId: "r-varsity-2026",
    startsAt: "2026-03-02T19:30:00",
    opponent: "Steel City Knights",
    location: "UMPC Rink 1",
    status: "final",
    warriorsScore: 4,
    opponentScore: 2,
    events: [
      { time: "03:21 P1", team: "Warriors", type: "goal", note: "Mercer from slot" },
      { time: "09:54 P2", team: "Opponent", type: "goal", note: "Even strength" },
      { time: "16:07 P3", team: "Warriors", type: "goal", note: "Empty net" }
    ]
  },
  {
    id: "g-1002",
    seasonId: "s-2026-spring",
    rosterId: "r-varsity-2026",
    startsAt: "2026-03-12T20:00:00",
    opponent: "Riverfront Rangers",
    location: "Pittsburgh Ice Arena",
    status: "live",
    warriorsScore: 2,
    opponentScore: 1,
    events: [
      { time: "05:44 P1", team: "Warriors", type: "goal", note: "Power-play tip" },
      { time: "11:18 P2", team: "Opponent", type: "goal", note: "Breakaway" },
      { time: "14:50 P2", team: "Warriors", type: "goal", note: "Blue-line one timer" }
    ]
  },
  {
    id: "g-1003",
    seasonId: "s-2026-dev",
    rosterId: "r-dev-2026",
    startsAt: "2026-03-18T18:00:00",
    opponent: "North Hills Select",
    location: "RMU Island Sports",
    status: "scheduled",
    warriorsScore: 0,
    opponentScore: 0,
    events: []
  }
];

export const news: NewsItem[] = [
  {
    id: "n-1",
    title: "Warriors Launch Spring Season",
    date: "2026-02-01",
    summary: "The Pittsburgh Warriors open spring programming with expanded veteran outreach."
  },
  {
    id: "n-2",
    title: "New Equipment Donation Drive",
    date: "2026-02-10",
    summary: "Local partners are helping fund adaptive gear and travel support for players."
  }
];
