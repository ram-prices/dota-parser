import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMatch, getMatchIndexForStats, getMatches, getProfile, getWinLoss, OpenDotaError } from "../opendota";
import type { MatchSummary, PlayerProfile, WinLoss } from "../types";
import {
  averageRankTier,
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
  rankTierColor,
  rankTierLabel,
  type LaneOutcome,
} from "../dota";

const PAGE_SIZE = 30;

type ResultFilter = "all" | "win" | "loss";
type ModeFilter = "all" | "ranked" | "unranked";

function matchWon(m: MatchSummary): boolean {
  return isRadiant(m.player_slot) === m.radiant_win;
}

export function Dashboard({ accountId }: { accountId: number }) {
  // Page + filters are all mirrored into the URL so that clicking into a
  // match and then hitting the browser's back button lands you back on
  // the same page with the same filters, instead of resetting - React
  // Router unmounts/remounts this component on that round trip, so plain
  // state alone can't survive it, but the URL does.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  const initialHero = Math.floor(Number(searchParams.get("hero"))) || 0;
  const initialResult = (searchParams.get("result") as ResultFilter) || "all";
  const initialMode = (searchParams.get("mode") as ModeFilter) || "all";

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [wl, setWl] = useState<WinLoss | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The full match history - undefined while loading, null when the
  // stored index isn't available (falls back to a short, unfiltered
  // live-API list below instead, since filtering/paginating the live API
  // properly would mean a lot more plumbing for a rare fallback path).
  const [allMatches, setAllMatches] = useState<MatchSummary[] | null | undefined>(undefined);
  const [fallbackMatches, setFallbackMatches] = useState<MatchSummary[] | null>(null);

  const [page, setPage] = useState(initialPage);
  const [heroFilter, setHeroFilter] = useState(initialHero);
  const [resultFilter, setResultFilter] = useState<ResultFilter>(initialResult);
  const [modeFilter, setModeFilter] = useState<ModeFilter>(initialMode);

  // undefined = still loading, null = loaded but no rank data available
  const [ranks, setRanks] = useState<Record<number, number | null | undefined>>({});
  const [roles, setRoles] = useState<Record<number, number | null | undefined>>({});
  const [lanes, setLanes] = useState<Record<number, LaneOutcome | null | undefined>>({});

  function updateParams(next: { page?: number; hero?: number; result?: ResultFilter; mode?: ModeFilter }) {
    const merged = { page, hero: heroFilter, result: resultFilter, mode: modeFilter, ...next };
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (merged.page <= 1) params.delete("page");
        else params.set("page", String(merged.page));
        if (!merged.hero) params.delete("hero");
        else params.set("hero", String(merged.hero));
        if (merged.result === "all") params.delete("result");
        else params.set("result", merged.result);
        if (merged.mode === "all") params.delete("mode");
        else params.set("mode", merged.mode);
        return params;
      },
      { replace: true },
    );
    if (next.page !== undefined) setPage(next.page);
    if (next.hero !== undefined) setHeroFilter(next.hero);
    if (next.result !== undefined) setResultFilter(next.result);
    if (next.mode !== undefined) setModeFilter(next.mode);
  }

  useEffect(() => {
    setProfile(null);
    setWl(null);
    setError(null);
    setAllMatches(undefined);
    setFallbackMatches(null);

    Promise.all([getProfile(accountId), getWinLoss(accountId)])
      .then(([p, w]) => {
        setProfile(p);
        setWl(w);
      })
      .catch((e) => setError(e instanceof OpenDotaError ? e.message : String(e)));

    getMatchIndexForStats()
      .then(setAllMatches)
      .catch(() => setAllMatches(null));
  }, [accountId]);

  // Only reached when the stored index isn't available - no filters or
  // real pagination in that case, just a short recent-matches list
  // straight from OpenDota's live API.
  useEffect(() => {
    if (allMatches !== null) return;
    getMatches(accountId, { limit: PAGE_SIZE })
      .then(setFallbackMatches)
      .catch((e) => setError(e instanceof OpenDotaError ? e.message : String(e)));
  }, [allMatches, accountId]);

  const heroOptions = useMemo(() => {
    if (!allMatches) return [];
    return Array.from(new Set(allMatches.map((m) => m.hero_id))).sort((a, b) => heroName(a).localeCompare(heroName(b)));
  }, [allMatches]);

  const filtered = useMemo(() => {
    if (!allMatches) return null;
    return allMatches.filter((m) => {
      if (heroFilter && m.hero_id !== heroFilter) return false;
      if (resultFilter !== "all") {
        const won = matchWon(m);
        if (resultFilter === "win" && !won) return false;
        if (resultFilter === "loss" && won) return false;
      }
      if (modeFilter !== "all") {
        const ranked = m.lobby_type === 7;
        if (modeFilter === "ranked" && !ranked) return false;
        if (modeFilter === "unranked" && ranked) return false;
      }
      return true;
    });
  }, [allMatches, heroFilter, resultFilter, modeFilter]);

  const totalPages = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : null;
  const clampedPage = totalPages != null ? Math.min(page, totalPages) : page;

  const pageMatches = useMemo(() => {
    if (filtered) return filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);
    return fallbackMatches;
  }, [filtered, clampedPage, fallbackMatches]);

  // Average skill/rank, and this account's own played role, aren't in the
  // lightweight match-list response - only the full match detail has every
  // player's rank_tier/position_est. Fetch each one (free/instant for
  // anything already in the data branch, a live API call otherwise) and
  // fill both columns in as they resolve rather than blocking the table.
  useEffect(() => {
    if (!pageMatches) return;
    setRanks({});
    setRoles({});
    setLanes({});
    for (const match of pageMatches) {
      getMatch(match.match_id)
        .then((detail) => {
          const tier = averageRankTier(detail.players.map((p) => p.rank_tier));
          setRanks((prev) => ({ ...prev, [match.match_id]: tier }));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMatches]);

  if (error) return <div className="error-box">{error}</div>;
  if (!profile || !wl || allMatches === undefined || !pageMatches) return <div className="loading">Loading from OpenDota...</div>;

  const winRate = wl.win + wl.lose > 0 ? Math.round((100 * wl.win) / (wl.win + wl.lose)) : 0;
  const hasNext = totalPages != null && clampedPage < totalPages;
  const hasPrev = clampedPage > 1;

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

      {allMatches && (
        <div className="toolbar match-filters">
          <select value={heroFilter} onChange={(e) => updateParams({ hero: Number(e.target.value), page: 1 })}>
            <option value={0}>All Heroes</option>
            {heroOptions.map((id) => (
              <option key={id} value={id}>
                {heroName(id)}
              </option>
            ))}
          </select>
          <select value={resultFilter} onChange={(e) => updateParams({ result: e.target.value as ResultFilter, page: 1 })}>
            <option value="all">All Results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
          </select>
          <select value={modeFilter} onChange={(e) => updateParams({ mode: e.target.value as ModeFilter, page: 1 })}>
            <option value="all">All Modes</option>
            <option value="ranked">Ranked</option>
            <option value="unranked">Unranked</option>
          </select>
        </div>
      )}

      {!allMatches && <p className="text-dim small">Full match history isn't exported yet - showing recent matches only, no filters.</p>}

      {pageMatches.length === 0 ? (
        <div className="empty-state">No matches match these filters.</div>
      ) : (
        <table className="match-table">
          <tbody>
            {pageMatches.map((m, i) => {
              const won = matchWon(m);
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
                      <span className="small" style={{ color: rankTierColor(ranks[m.match_id]) ?? "var(--text-dim)" }}>
                        {ranks[m.match_id] === undefined ? "…" : (ranks[m.match_id] ? rankTierLabel(ranks[m.match_id]) : "-")}
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
      )}

      {allMatches && (
        <div className="pagination">
          <button onClick={() => updateParams({ page: 1 })} disabled={!hasPrev}>
            First
          </button>
          <button onClick={() => updateParams({ page: clampedPage - 1 })} disabled={!hasPrev}>
            Prev
          </button>
          <span className="pagination-page">{totalPages != null ? `Page ${clampedPage} of ${totalPages}` : `Page ${clampedPage}`}</span>
          <button onClick={() => updateParams({ page: clampedPage + 1 })} disabled={!hasNext}>
            Next
          </button>
          <button onClick={() => totalPages != null && updateParams({ page: totalPages })} disabled={totalPages == null || clampedPage === totalPages}>
            Last
          </button>
        </div>
      )}
    </div>
  );
}
