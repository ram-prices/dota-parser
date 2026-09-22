import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMatch, getMatches, getProfile, getWinLoss, OpenDotaError } from "../opendota";
import type { MatchSummary, PlayerProfile, WinLoss } from "../types";
import { averageRankLabel, formatDuration, formatRelativeTime, heroIcon, heroName, isRadiant, matchModeLabel } from "../dota";

export function Dashboard({ accountId }: { accountId: number }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [wl, setWl] = useState<WinLoss | null>(null);
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined = still loading, null = loaded but no rank data available
  const [ranks, setRanks] = useState<Record<number, string | null | undefined>>({});

  useEffect(() => {
    setProfile(null);
    setWl(null);
    setMatches(null);
    setError(null);
    setRanks({});

    Promise.all([getProfile(accountId), getWinLoss(accountId), getMatches(accountId, { limit: 30 })])
      .then(([p, w, m]) => {
        setProfile(p);
        setWl(w);
        setMatches(m);

        // Average skill/rank per match isn't in the lightweight match-list
        // response - only the full match detail has every player's
        // rank_tier. Fetch each one (free/instant for anything already in
        // the data branch, a live API call otherwise) and fill the column
        // in as they resolve rather than blocking the whole table on it.
        for (const match of m) {
          getMatch(match.match_id)
            .then((detail) => {
              const label = averageRankLabel(detail.players.map((p) => p.rank_tier));
              setRanks((prev) => ({ ...prev, [match.match_id]: label }));
            })
            .catch(() => setRanks((prev) => ({ ...prev, [match.match_id]: null })));
        }
      })
      .catch((e) => setError(e instanceof OpenDotaError ? e.message : String(e)));
  }, [accountId]);

  if (error) return <div className="error-box">{error}</div>;
  if (!profile || !wl || !matches) return <div className="loading">Loading from OpenDota...</div>;

  const winRate = wl.win + wl.lose > 0 ? Math.round((100 * wl.win) / (wl.win + wl.lose)) : 0;

  return (
    <div>
      <div className="profile-header">
        {profile.profile?.avatarfull && <img src={profile.profile.avatarfull} alt="" className="avatar" />}
        <div>
          <h2>{profile.profile?.personaname ?? `Account ${accountId}`}</h2>
          <p className="text-dim">
            {wl.win}W&nbsp;-&nbsp;{wl.lose}L ({winRate}% winrate, last {wl.win + wl.lose} recorded matches)
          </p>
        </div>
      </div>

      <table className="match-list">
        <thead>
          <tr>
            <th>Result</th>
            <th>Hero</th>
            <th>Mode</th>
            <th>Avg Rank</th>
            <th>K / D / A</th>
            <th>GPM / XPM</th>
            <th>Duration</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => {
            const won = isRadiant(m.player_slot) === m.radiant_win;
            return (
              <tr
                key={m.match_id}
                className={won ? "row-win" : "row-loss"}
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
              >
                <td className="result-cell">
                  <Link to={`/matches/${m.match_id}`}>{won ? "Win" : "Loss"}</Link>
                </td>
                <td className="hero-cell">
                  {heroIcon(m.hero_id) && <img src={heroIcon(m.hero_id)!} alt="" className="hero-icon" />}
                  {heroName(m.hero_id)}
                </td>
                <td>{matchModeLabel(m.game_mode, m.lobby_type)}</td>
                <td className="text-dim">
                  {ranks[m.match_id] === undefined ? "…" : (ranks[m.match_id] ?? "-")}
                </td>
                <td>
                  {m.kills} / {m.deaths} / {m.assists}
                </td>
                <td>
                  {m.gold_per_min} / {m.xp_per_min}
                </td>
                <td>{formatDuration(m.duration)}</td>
                <td>{formatRelativeTime(m.start_time)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
