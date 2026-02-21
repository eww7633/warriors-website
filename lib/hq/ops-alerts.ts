import { readStore } from "@/lib/hq/store";
import { listOpsRoleAssignments } from "@/lib/hq/permissions";

function normalizeEmail(email?: string | null) {
  const value = String(email || "").trim().toLowerCase();
  return value || null;
}

export async function listOpsAlertRecipients() {
  const [store, assignments] = await Promise.all([readStore(), listOpsRoleAssignments()]);
  const recipients = new Set<string>();

  const envSuperAdmins = String(process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean) as string[];
  for (const email of envSuperAdmins) {
    recipients.add(email);
  }

  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));
  for (const assignment of assignments) {
    const official = normalizeEmail(assignment.officialEmail);
    if (official) {
      recipients.add(official);
    }
    const user = usersById.get(assignment.userId);
    const userEmail = normalizeEmail(user?.email);
    if (userEmail) {
      recipients.add(userEmail);
    }
  }

  return Array.from(recipients);
}

