import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";

type GameScoreCardProps = {
  gameId: string;
  startsAt: string;
  location?: string;
  liveStatus: string;
  competitionTitle?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  period?: string;
  clock?: string;
  showManageLink?: boolean;
};

function statusLabel(status: string) {
  if (status === "live") return "Live";
  if (status === "final") return "Final";
  return "Scheduled";
}

export default function GameScoreCard(props: GameScoreCardProps) {
  const status = statusLabel(props.liveStatus);
  return (
    <article className="game-score-card">
      <div className="game-score-top">
        <p className={`score-status score-status-${props.liveStatus}`}>
          {status}
          {props.liveStatus === "live" && props.clock ? ` · ${props.clock}` : ""}
        </p>
        <p className="muted">
          {new Date(props.startsAt).toLocaleString()}
          {props.location ? ` · ${props.location}` : ""}
        </p>
      </div>

      <div className="scoreboard-main">
        <div className="score-team">
          <TeamBadge name={props.homeTeamName} size="md" />
          <div>
            <strong>{props.homeTeamName}</strong>
            <p className="muted">Warriors</p>
          </div>
        </div>
        <p className="score-value">{props.homeScore}</p>
      </div>

      <div className="scoreboard-main">
        <div className="score-team">
          <TeamBadge name={props.awayTeamName} size="md" />
          <div>
            <strong>{props.awayTeamName}</strong>
            <p className="muted">Opponent</p>
          </div>
        </div>
        <p className="score-value">{props.awayScore}</p>
      </div>

      <div className="score-meta-row">
        <span className="score-chip">{props.period || "P1"}</span>
        {props.competitionTitle ? <span className="score-chip">{props.competitionTitle}</span> : null}
      </div>

      {props.showManageLink ? (
        <p className="score-link-row">
          <Link href={`/games#${props.gameId}`}>Open game center</Link>
        </p>
      ) : null}
    </article>
  );
}
