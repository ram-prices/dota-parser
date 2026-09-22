import { useEffect, useState } from "react";
import { getPeers, OpenDotaError } from "../opendota";
import type { PeerStat } from "../types";
import { formatRelativeTime } from "../dota";

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
      <p className="text-dim">Win rate in matches played alongside each teammate (party or randomly matched).</p>
      <table className="match-list">
        <thead>
          <tr>
            <th>Player</th>
            <th>Games together</th>
            <th>Win rate together</th>
            <th>Last played</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.account_id}>
              <td className="hero-cell">
                {p.avatar && <img src={p.avatar} alt="" className="hero-icon" />}
                {p.personaname ?? `Account ${p.account_id}`}
              </td>
              <td>{p.games}</td>
              <td>{p.games > 0 ? `${Math.round((100 * p.win) / p.games)}%` : "-"}</td>
              <td>{formatRelativeTime(p.last_played)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
