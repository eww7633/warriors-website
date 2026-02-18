import { roster } from "@/lib/mockData";
import { resolveRole } from "@/lib/auth";

type PlayerPageProps = {
  searchParams: {
    role?: string;
  };
};

export default function PlayerPage({ searchParams }: PlayerPageProps) {
  const role = resolveRole(searchParams.role);

  return (
    <section className="stack">
      <article className="card">
        <h2>Player Registration</h2>
        <p>Complete registration to access private events and roster tools.</p>
        <form className="grid-form" action="/api/register" method="post">
          <input name="fullName" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="phone" placeholder="Phone" />
          <select name="position" required>
            <option value="">Preferred position</option>
            <option value="F">Forward</option>
            <option value="D">Defense</option>
            <option value="G">Goalie</option>
          </select>
          <button className="button" type="submit">Submit Registration</button>
        </form>
      </article>

      <article className="card">
        <h3>Roster Snapshot ({role})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pos</th>
              <th>Status</th>
              <th>GP</th>
              <th>G</th>
              <th>A</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.position}</td>
                <td>{player.status}</td>
                <td>{player.gamesPlayed}</td>
                <td>{player.goals}</td>
                <td>{player.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
