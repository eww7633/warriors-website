import { getTeamBranding } from "@/lib/team-branding";
import type { CSSProperties } from "react";

export default function TeamBadge({
  name,
  size = "md"
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const branding = getTeamBranding(name);
  return (
    <div
      className={`team-badge team-badge-${size}`}
      style={
        {
          "--badge-bg": branding.background,
          "--badge-fg": branding.foreground,
          "--badge-ring": branding.ring,
          "--badge-accent": branding.accent
        } as CSSProperties
      }
      title={branding.name}
      aria-label={branding.name}
    >
      <span>{branding.initials}</span>
    </div>
  );
}
