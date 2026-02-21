import { NextResponse } from "next/server";
import { replaceDvhlSchedule } from "@/lib/hq/competitions";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function asInt(formData: FormData, key: string, fallback: number) {
  const raw = Number(asText(formData, key));
  return Number.isFinite(raw) ? raw : fallback;
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildStandardDvhlWeeks(input: {
  teamIds: [string, string, string, string];
  cycleCount: number;
  baseStartsAt?: string;
  weekIntervalDays: number;
  gameGapMinutes: number;
  location?: string;
}) {
  const [t1, t2, t3, t4] = input.teamIds;
  const cycleTemplate = [
    [
      [t1, t2],
      [t3, t4]
    ],
    [
      [t1, t3],
      [t2, t4]
    ],
    [
      [t1, t4],
      [t2, t3]
    ]
  ] as const;

  const base = parseOptionalDate(input.baseStartsAt);
  let weekNumber = 1;
  const weeks: Array<{
    weekNumber: number;
    games: Array<{
      homeTeamId: string;
      awayTeamId: string;
      startsAt?: string;
      location?: string;
    }>;
  }> = [];

  for (let cycle = 0; cycle < input.cycleCount; cycle += 1) {
    for (const pairing of cycleTemplate) {
      const weekStart = base ? new Date(base.getTime()) : null;
      if (weekStart) {
        weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * input.weekIntervalDays);
      }
      const secondStart = weekStart
        ? new Date(weekStart.getTime() + Math.max(input.gameGapMinutes, 0) * 60_000)
        : null;

      weeks.push({
        weekNumber,
        games: [
          {
            homeTeamId: pairing[0][0],
            awayTeamId: pairing[0][1],
            startsAt: weekStart?.toISOString(),
            location: input.location
          },
          {
            homeTeamId: pairing[1][0],
            awayTeamId: pairing[1][1],
            startsAt: secondStart?.toISOString(),
            location: input.location
          }
        ]
      });
      weekNumber += 1;
    }
  }

  return weeks;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (
    !actor ||
    !(await canAccessAdminPanel(actor)) ||
    !((await userHasPermission(actor, "manage_dvhl")) || (await userHasPermission(actor, "manage_events")))
  ) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const mode = asText(formData, "mode");
  const competitionId = asText(formData, "competitionId");
  const returnToRaw = asText(formData, "returnTo");
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/dvhl?tab=schedule";
  const clearExisting = asText(formData, "clearExisting") === "on";

  if (!competitionId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_competition_id"), request.url), 303);
  }

  let weeks: Array<{
    weekNumber: number;
    games: Array<{
      homeTeamId: string;
      awayTeamId: string;
      startsAt?: string;
      location?: string;
    }>;
  }> = [];

  if (mode === "preset") {
    const teamIds: [string, string, string, string] = [
      asText(formData, "team1"),
      asText(formData, "team2"),
      asText(formData, "team3"),
      asText(formData, "team4")
    ];
    if (teamIds.some((entry) => !entry)) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "preset_missing_team_ids"), request.url), 303);
    }
    const cycleCount = Math.max(1, Math.min(4, asInt(formData, "cycleCount", 2)));
    const weekIntervalDays = Math.max(1, Math.min(21, asInt(formData, "weekIntervalDays", 7)));
    const gameGapMinutes = Math.max(0, Math.min(360, asInt(formData, "gameGapMinutes", 90)));
    const baseStartsAt = asText(formData, "baseStartsAt");
    const location = asText(formData, "defaultLocation");
    weeks = buildStandardDvhlWeeks({
      teamIds,
      cycleCount,
      baseStartsAt: baseStartsAt || undefined,
      weekIntervalDays,
      gameGapMinutes,
      location: location || undefined
    });
  } else {
    weeks = Array.from({ length: 6 }, (_, index) => {
      const weekNumber = index + 1;
      const game1 = {
        homeTeamId: asText(formData, `w${weekNumber}g1Home`),
        awayTeamId: asText(formData, `w${weekNumber}g1Away`),
        startsAt: asText(formData, `w${weekNumber}g1StartsAt`),
        location: asText(formData, `w${weekNumber}g1Location`)
      };
      const game2 = {
        homeTeamId: asText(formData, `w${weekNumber}g2Home`),
        awayTeamId: asText(formData, `w${weekNumber}g2Away`),
        startsAt: asText(formData, `w${weekNumber}g2StartsAt`),
        location: asText(formData, `w${weekNumber}g2Location`)
      };

      return {
        weekNumber,
        games: [game1, game2]
      };
    });
  }

  try {
    await replaceDvhlSchedule({
      competitionId,
      clearExisting,
      weeks
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "schedule_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_schedule_save_failed"), request.url), 303);
  }
}
