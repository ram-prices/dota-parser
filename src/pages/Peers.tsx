import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPeers, OpenDotaError } from "../opendota";
import type { PeerStat } from "../types";
import { formatRelativeTime } from "../dota";

function pct(win: number | undefined, games: number | undefined): string {
  if (!games) return "-";
  return `${Math.round((100 * (win ?? 0)) / games)}%`;
}

export function Peers({ accountId }: { accountId: number }) {
  const [peers, setPeers] = useState<PeerStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeers(accountId)
      .then((p) => setPeers([...p].sort((a, b) => b.games - a.games)))
      .catch((e) => setError(e instanceof OpenDotaError ? e.message : String(e)));
  }, [accountId]);

  if (error) return <div className="error-box">{error}</div>;
  if (!peers) return <div className="loading">Loading teammate stats...</div>;

  return (
    <div>
      <h2>Teammates</h2>
      <p className="text-dim">
        Lifetime stats with and against everyone you've been matched with. Click a name for the full breakdown.
      </p>
      <table className="match-list">
        <thead>
          <tr>
            <th>Player</th>
            <th>Games together</th>
            <th>Win rate as teammates</th>
            <th>Win rate as opponents</th>
            <th>Last played</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.account_id}>
              <td className="hero-cell">
                {p.avatar && <img src={p.avatar} alt="" className="hero-icon" />}
                <Link to={`/vs/${p.account_id}`}>{p.personaname ?? `Account ${p.account_id}`}</Link>
              </td>
              <td>{p.with_games ?? p.games}</td>
              <td>{pct(p.with_win ?? p.win, p.with_games ?? p.games)}</td>
              <td>
                {p.against_games ? `${pct(p.against_win, p.against_games)} (${p.against_games})` : "-"}
              </td>
              <td>{formatRelativeTime(p.last_played)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
