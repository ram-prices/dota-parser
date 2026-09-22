import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMatch, getMatches, getProfile, getWinLoss, OpenDotaError } from "../opendota";
import type { MatchSummary, PlayerProfile, WinLoss } from "../types";
import {
  averageRankLabel,
  formatDuration,
  formatRelativeTime,
  gameModeName,
  heroIcon,
  heroName,
  isRadiant,
  laneOutcome,
  laneOutcomeLabel,
  positionLabel,
  positionShort,
  type LaneOutcome,
} from "../dota";

export function Dashboard({ accountId }: { accountId: number }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [wl, setWl] = useState<WinLoss | null>(null);
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined = still loading, null = loaded but no rank data available
  const [ranks, setRanks] = useState<Record<number, string | null | undefined>>({});
  const [roles, setRoles] = useState<Record<number, number | null | undefined>>({});
  const [lanes, setLanes] = useState<Record<number, LaneOutcome | null | undefined>>({});

  useEffect(() => {
    setProfile(null);
    setWl(null);
    setMatches(null);
    setError(null);
    setRanks({});
    setRoles({});
    setLanes({});

    Promise.all([getProfile(accountId), getWinLoss(accountId), getMatches(accountId, { limit: 30 })])
      .then(([p, w, m]) => {
        setProfile(p);
        setWl(w);
        setMatches(m);

        // Average skill/rank, and this account's own played role, aren't in
        // the lightweight match-list response - only the full match detail
        // has every player's rank_tier/position_est. Fetch each one
        // (free/instant for anything already in the data branch, a live API
        // call otherwise) and fill both columns in as they resolve rather
        // than blocking the whole table on it.
        for (const match of m) {
          getMatch(match.match_id)
            .then((detail) => {
              const label = averageRankLabel(detail.players.map((p) => p.rank_tier));
              setRanks((prev) => ({ ...prev, [match.match_id]: label }));

              const self = detail.players.find((p) => p.player_slot === match.player_slot);
              setRoles((prev) => ({ ...prev, [match.match_id]: self?.position_est ?? null }));

              setLanes((prev) => ({ ...prev, [match.match_id]: laneOutcome(detail, match.player_slot) }));
            })
            .catch(() => {
              setRanks((prev) => ({ ...prev, [match.match_id]: null }));
              setRoles((prev) => ({ ...prev, [match.match_id]: null }));
              setLanes((prev) => ({ ...prev, [match.match_id]: null }));
            });
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

      <table className="match-table">
        <tbody>
          {matches.map((m, i) => {
            const won = isRadiant(m.player_slot) === m.radiant_win;
            return (
              <tr
                key={m.match_id}
                className={`match-row ${won ? "row-win" : "row-loss"}`}
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
              >
                <td className="match-row-hero-cell">
                  {/* Covers the whole row so the entire match is one click
                      target, while still being a real <a> (browser back/
                      forward, open-in-new-tab, keyboard nav all just work) -
                      a <tr> can't be wrapped in an <a> directly. */}
                  <Link
                    to={`/matches/${m.match_id}`}
                    className="match-row-link"
                    aria-label={`${heroName(m.hero_id)} - ${won ? "Win" : "Loss"} - ${formatRelativeTime(m.start_time)}`}
                  />
                  <span className="match-row-hero">
                    {heroIcon(m.hero_id) && (
                      <img src={heroIcon(m.hero_id)!} alt={heroName(m.hero_id)} className="hero-icon" />
                    )}
                    <span className="match-row-hero-name">{heroName(m.hero_id)}</span>
                    {positionShort(roles[m.match_id]) && (
                      <span className="role-badge" title={positionLabel(roles[m.match_id]) ?? undefined}>
                        {positionShort(roles[m.match_id])}
                      </span>
                    )}
                  </span>
                </td>
                <td className="match-row-result-cell">
                  <span className="match-row-result">
                    <span className="result-badge">{won ? "W" : "L"}</span>
                    {lanes[m.match_id] && (
                      <span
                        className={`lane-pill lane-${lanes[m.match_id]}`}
                        title={laneOutcomeLabel(lanes[m.match_id]) ?? undefined}
                      >
                        <span className="lane-pill-arrow" aria-hidden="true">
                          ↖
                        </span>
                        {lanes[m.match_id] === "won" ? "W" : lanes[m.match_id] === "lost" ? "L" : "D"}
                      </span>
                    )}
                  </span>
                </td>
                <td className="match-row-kda-cell">
                  {m.kills} / {m.deaths} / {m.assists}
                </td>
                <td className="match-row-mode-cell">
                  <div className="match-row-stacked">
                    <span>{m.lobby_type === 7 ? "Ranked" : "Unranked"}</span>
                    <span className="text-dim small">{gameModeName(m.game_mode)}</span>
                    <span className="text-dim small">
                      {ranks[m.match_id] === undefined ? "…" : (ranks[m.match_id] ?? "-")}
                    </span>
                  </div>
                </td>
                <td className="match-row-duration-cell">
                  <div className="match-row-stacked">
                    <span>{formatDuration(m.duration)}</span>
                    <span className="text-dim small">{formatRelativeTime(m.start_time)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
