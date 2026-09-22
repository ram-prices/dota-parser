import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { AccountMatchRow } from "../types";
import { formatDuration, formatRelativeTime, heroIcon, heroName } from "../dota";

export function Player() {
  const { accountId } = useParams();
  const [matches, setMatches] = useState<AccountMatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    api
      .accountMatches(Number(accountId), 30)
      .then((r) => setMatches(r.matches))
      .catch((e) => setError(String(e)));
  }, [accountId]);

  if (error) return <div className="error-box">{error}</div>;

  return (
    <div>
      <h2>Match history for account {accountId}</h2>
      <table className="match-list">
        <thead>
          <tr>
            <th>Result</th>
            <th>Hero</th>
            <th>K / D / A</th>
            <th>Duration</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.match_id} className={m.won ? "row-win" : "row-loss"}>
              <td>
                <Link to={`/matches/${m.match_id}`}>{m.won ? "Win" : "Loss"}</Link>
              </td>
              <td className="hero-cell">
                {heroIcon(m.hero_id) && <img src={heroIcon(m.hero_id)!} alt="" className="hero-icon" />}
                {heroName(m.hero_id)}
              </td>
              <td>
                {m.kills} / {m.deaths} / {m.assists}
              </td>
              <td>{formatDuration(m.duration)}</td>
              <td>{formatRelativeTime(m.start_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
