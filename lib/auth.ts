import { Role } from "@/lib/types";

export function resolveRole(rawRole?: string): Role {
  if (rawRole === "admin") {
    return "admin";
  }

  if (rawRole === "player") {
    return "player";
  }

  return "public";
}

export function isPrivileged(role: Role): boolean {
  return role === "player" || role === "admin";
}
