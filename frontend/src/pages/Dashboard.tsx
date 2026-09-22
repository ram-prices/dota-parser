import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { AccountMatchRow, StatusResponse } from "../types";
import { formatDuration, formatRelativeTime, heroIcon, heroName, itemImage, itemName } from "../dota";

export function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [matches, setMatches] = useState<AccountMatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .status()
      .then((s) => {
        setStatus(s);
        if (s.accounts.length > 0) setSelectedAccount(s.accounts[0].account_id);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (selectedAccount == null) return;
    setLoading(true);
    api
      .accountMatches(selectedAccount, 30)
      .then((r) => setMatches(r.matches))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  if (error) return <div className="error-box">{error}</div>;
  if (!status) return <div className="loading">Loading...</div>;

  if (status.accounts.length === 0) {
    return (
      <div className="empty-state">
        <h2>No tracked accounts yet</h2>
        <p>
          Set <code>STEAM_API_KEY</code> and <code>STEAM_ACCOUNT_IDS</code> in your <code>.env</code> file and
          restart the backend. Once it polls Steam for the first time, tracked accounts will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <label>
          Account:{" "}
          <select value={selectedAccount ?? ""} onChange={(e) => setSelectedAccount(Number(e.target.value))}>
            {status.accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.persona_name ?? a.account_id}
              </option>
            ))}
          </select>
        </label>
        <span className="poll-info">
          Polling every {status.pollIntervalSeconds}s &middot; {status.totalMatches} matches stored
        </span>
      </div>

      {loading && <div className="loading">Loading matches...</div>}

      <table className="match-list">
        <thead>
          <tr>
            <th>Result</th>
            <th>Hero</th>
            <th>K / D / A</th>
            <th>LH / DN</th>
            <th>GPM / XPM</th>
            <th>Items</th>
            <th>Duration</th>
            <th>When</th>
            <th>Parse</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.match_id} className={m.won ? "row-win" : "row-loss"}>
              <td className="result-cell">
                <Link to={`/matches/${m.match_id}`}>{m.won ? "Win" : "Loss"}</Link>
              </td>
              <td className="hero-cell">
                {heroIcon(m.hero_id) && <img src={heroIcon(m.hero_id)!} alt="" className="hero-icon" />}
                {heroName(m.hero_id)}
              </td>
              <td>
                {m.kills} / {m.deaths} / {m.assists}
              </td>
              <td>
                {m.last_hits} / {m.denies}
              </td>
              <td>
                {m.gold_per_min} / {m.xp_per_min}
              </td>
              <td>
                <div className="item-row">
                  {m.items
                    .filter((id) => id)
                    .map((id, idx) => {
                      const img = itemImage(id);
                      return img ? <img key={idx} src={img} alt={itemName(id)} title={itemName(id)} className="item-icon" /> : null;
                    })}
                </div>
              </td>
              <td>{formatDuration(m.duration)}</td>
              <td>{formatRelativeTime(m.start_time)}</td>
              <td>
                <span className={`badge badge-${m.parse_status}`}>{m.parse_status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
