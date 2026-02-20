import { readStore } from "@/lib/hq/store";
import { listOpsRoleAssignments, OpsRoleKey } from "@/lib/hq/permissions";

const roleCopy: Record<string, string> = {
  president: "Leads organizational strategy, governance, and partner alignment.",
  vp_hockey_ops: "Leads Hockey Ops execution, roster operations, and event readiness."
};

export default async function LeadershipPage() {
  const [store, assignments] = await Promise.all([readStore(), listOpsRoleAssignments()]);
  const roleMap = new Map(assignments.map((entry) => [entry.roleKey, entry]));
  const leadershipRoles: OpsRoleKey[] = ["president", "vp_hockey_ops"];
  const leadership = leadershipRoles.map((roleKey) => {
    const assignment = roleMap.get(roleKey);
    const user = assignment ? store.users.find((entry) => entry.id === assignment.userId) : null;
    return {
      role: assignment?.titleLabel || (roleKey === "president" ? "President" : "Vice President of Hockey Ops"),
      name: user?.fullName || "TBD",
      email: assignment?.officialEmail || undefined,
      summary: roleCopy[roleKey]
    };
  });

  return (
    <article className="card">
      <p className="eyebrow">Leadership</p>
      <h2>Program Leadership</h2>
      <p className="muted">
        Leadership updates dynamically from Hockey Ops role assignments in Warrior HQ.
      </p>
      <div className="about-card-grid">
        {leadership.map((member) => (
          <article key={member.role} className="event-card">
            <h3>{member.name}</h3>
            <p className="kicker">{member.role}</p>
            <p>{member.summary}</p>
            {member.email ? <p><a href={`mailto:${member.email}`}>{member.email}</a></p> : null}
          </article>
        ))}
      </div>
    </article>
  );
}
