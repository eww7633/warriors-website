export type TeamBranding = {
  name: string;
  initials: string;
  background: string;
  foreground: string;
  ring: string;
  accent: string;
};

function initialsFromName(name: string) {
  const parts = name
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "TM";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function hashHue(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function buildNeutralBranding(name: string): TeamBranding {
  const hue = hashHue(name.toLowerCase());
  const bg = `hsl(${hue} 45% 22%)`;
  const accent = `hsl(${(hue + 30) % 360} 72% 54%)`;
  const ring = `hsl(${hue} 28% 42%)`;
  return {
    name,
    initials: initialsFromName(name),
    background: bg,
    foreground: "#f8fafc",
    ring,
    accent
  };
}

const BRAND_MAP: Array<{ match: RegExp; branding: Omit<TeamBranding, "name" | "initials"> }> = [
  {
    match: /warriors|pittsburgh warriors/i,
    branding: {
      background: "#11161e",
      foreground: "#f6f8fc",
      ring: "#d9a32a",
      accent: "#2f65a0"
    }
  },
  {
    match: /gold/i,
    branding: {
      background: "#bc8a1a",
      foreground: "#1f1706",
      ring: "#f0d08d",
      accent: "#1e3048"
    }
  },
  {
    match: /black/i,
    branding: {
      background: "#141821",
      foreground: "#f3f5f8",
      ring: "#3b4658",
      accent: "#d9a42e"
    }
  },
  {
    match: /white/i,
    branding: {
      background: "#eceff3",
      foreground: "#1d2430",
      ring: "#c7d0da",
      accent: "#2f5a8e"
    }
  },
  {
    match: /khe\s*sahn/i,
    branding: {
      background: "#2f4331",
      foreground: "#f3f8ee",
      ring: "#6a8b6e",
      accent: "#d8a73a"
    }
  }
];

export function getTeamBranding(name: string): TeamBranding {
  const normalized = name.trim() || "Team";
  const matched = BRAND_MAP.find((entry) => entry.match.test(normalized));
  if (!matched) {
    return buildNeutralBranding(normalized);
  }
  return {
    name: normalized,
    initials: initialsFromName(normalized),
    ...matched.branding
  };
}
