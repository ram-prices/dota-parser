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
  lobbyTypeLabel,
  positionLabel,
  positionShort,
  rankTierColor,
  rankTierLabel,
  type LaneOutcome,
} from "../dota";

const PAGE_SIZE = 30;

type ResultFilter = "all" | "win" | "loss";
type ModeFilter = "all" | "ranked" | "unranked";
type FactionFilter = "all" | "radiant" | "dire";
type PartyFilter = "all" | "solo" | "party";
type TimeRangeFilter = "all" | "7d" | "30d" | "90d" | "180d" | "365d";

const TIME_RANGE_LABELS: Record<Exclude<TimeRangeFilter, "all">, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 3 Months",
  "180d": "Last 6 Months",
  "365d": "Last Year",
};
const TIME_RANGE_DAYS: Record<Exclude<TimeRangeFilter, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

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
  const initialGameMode = Math.floor(Number(searchParams.get("gm"))) || 0;
  const initialFaction = (searchParams.get("faction") as FactionFilter) || "all";
  const initialParty = (searchParams.get("party") as PartyFilter) || "all";
  const initialTimeRange = (searchParams.get("time") as TimeRangeFilter) || "all";

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
  const [gameModeFilter, setGameModeFilter] = useState(initialGameMode);
  const [factionFilter, setFactionFilter] = useState<FactionFilter>(initialFaction);
  const [partyFilter, setPartyFilter] = useState<PartyFilter>(initialParty);
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>(initialTimeRange);

  // undefined = still loading, null = loaded but no rank data available
  const [ranks, setRanks] = useState<Record<number, number | null | undefined>>({});
  const [roles, setRoles] = useState<Record<number, number | null | undefined>>({});
  const [lanes, setLanes] = useState<Record<number, LaneOutcome | null | undefined>>({});

  function updateParams(next: {
    page?: number;
    hero?: number;
    result?: ResultFilter;
    mode?: ModeFilter;
    gameMode?: number;
    faction?: FactionFilter;
    party?: PartyFilter;
    time?: TimeRangeFilter;
  }) {
    const merged = {
      page,
      hero: heroFilter,
      result: resultFilter,
      mode: modeFilter,
      gameMode: gameModeFilter,
      faction: factionFilter,
      party: partyFilter,
      time: timeRangeFilter,
      ...next,
    };
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
        if (!merged.gameMode) params.delete("gm");
        else params.set("gm", String(merged.gameMode));
        if (merged.faction === "all") params.delete("faction");
        else params.set("faction", merged.faction);
        if (merged.party === "all") params.delete("party");
        else params.set("party", merged.party);
        if (merged.time === "all") params.delete("time");
        else params.set("time", merged.time);
        return params;
      },
      { replace: true },
    );
    if (next.page !== undefined) setPage(next.page);
    if (next.hero !== undefined) setHeroFilter(next.hero);
    if (next.result !== undefined) setResultFilter(next.result);
    if (next.mode !== undefined) setModeFilter(next.mode);
    if (next.gameMode !== undefined) setGameModeFilter(next.gameMode);
    if (next.faction !== undefined) setFactionFilter(next.faction);
    if (next.party !== undefined) setPartyFilter(next.party);
    if (next.time !== undefined) setTimeRangeFilter(next.time);
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

  const gameModeOptions = useMemo(() => {
    if (!allMatches) return [];
    return Array.from(new Set(allMatches.map((m) => m.game_mode))).sort((a, b) => gameModeName(a).localeCompare(gameModeName(b)));
  }, [allMatches]);

  const filtered = useMemo(() => {
    if (!allMatches) return null;
    const cutoff = timeRangeFilter !== "all" ? Date.now() / 1000 - TIME_RANGE_DAYS[timeRangeFilter] * 86400 : null;
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
      if (gameModeFilter && m.game_mode !== gameModeFilter) return false;
      if (factionFilter !== "all") {
        const radiant = isRadiant(m.player_slot);
        if (factionFilter === "radiant" && !radiant) return false;
        if (factionFilter === "dire" && radiant) return false;
      }
      if (partyFilter !== "all") {
        const solo = !m.party_size || m.party_size <= 1;
        if (partyFilter === "solo" && !solo) return false;
        if (partyFilter === "party" && solo) return false;
      }
      if (cutoff != null && m.start_time < cutoff) return false;
      return true;
    });
  }, [allMatches, heroFilter, resultFilter, modeFilter, gameModeFilter, factionFilter, partyFilter, timeRangeFilter]);

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

  // When the index is available, the stat row reflects whatever filters
  // are currently applied (falling back to the unfiltered all-time wl
  // record - from OpenDota's own aggregated /wl endpoint - only when
  // there's no filtered set to derive it from, i.e. the live-API
  // fallback path, where filters are hidden anyway).
  const isFiltered = Boolean(heroFilter || resultFilter !== "all" || modeFilter !== "all" || gameModeFilter || factionFilter !== "all" || partyFilter !== "all" || timeRangeFilter !== "all");
  const filteredWins = filtered?.filter(matchWon).length ?? 0;
  const displayWl = filtered ? { win: filteredWins, lose: filtered.length - filteredWins } : wl;
  const winRate = displayWl.win + displayWl.lose > 0 ? Math.round((100 * displayWl.win) / (displayWl.win + displayWl.lose)) : 0;
  const hasNext = totalPages != null && clampedPage < totalPages;
  const hasPrev = clampedPage > 1;

  return (
    <div>
      <div className="profile-header">
        {profile.profile?.avatarfull && <img src={profile.profile.avatarfull} alt="" className="avatar" />}
        <div>
          <h2>{profile.profile?.personaname ?? `Account ${accountId}`}</h2>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-value text-radiant">{displayWl.win}</div>
          <div className="profile-stat-label">Wins</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value text-dire">{displayWl.lose}</div>
          <div className="profile-stat-label">Losses</div>
        </div>
        <div className="profile-stat profile-stat-winrate">
          <div className="profile-stat-value">{winRate}%</div>
          <div className="profile-stat-bar-track">
            <div className="profile-stat-bar" style={{ width: `${winRate}%` }} />
          </div>
          <div className="profile-stat-label">Win Rate</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">{displayWl.win + displayWl.lose}</div>
          <div className="profile-stat-label">{isFiltered ? "Filtered Matches" : "Total Matches"}</div>
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
          <select value={gameModeFilter} onChange={(e) => updateParams({ gameMode: Number(e.target.value), page: 1 })}>
            <option value={0}>All Game Modes</option>
            {gameModeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {gameModeName(mode)}
              </option>
            ))}
          </select>
          <select value={factionFilter} onChange={(e) => updateParams({ faction: e.target.value as FactionFilter, page: 1 })}>
            <option value="all">Radiant/Dire</option>
            <option value="radiant">Radiant</option>
            <option value="dire">Dire</option>
          </select>
          <select value={partyFilter} onChange={(e) => updateParams({ party: e.target.value as PartyFilter, page: 1 })}>
            <option value="all">Solo/Party</option>
            <option value="solo">Solo</option>
            <option value="party">Party</option>
          </select>
          <select value={timeRangeFilter} onChange={(e) => updateParams({ time: e.target.value as TimeRangeFilter, page: 1 })}>
            <option value="all">All Time</option>
            {(Object.keys(TIME_RANGE_LABELS) as Array<keyof typeof TIME_RANGE_LABELS>).map((key) => (
              <option key={key} value={key}>
                {TIME_RANGE_LABELS[key]}
              </option>
            ))}
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
                      <span>{lobbyTypeLabel(m.lobby_type)}</span>
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
