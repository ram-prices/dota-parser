import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MatchPlayer } from "../types";
import { computeApm, heroIcon, heroName, itemImage, itemName, rankTierColor, rankTierLabel } from "../dota";

// Width of the sticky hero-icon + hero-name columns that stay pinned to
// the left edge while the stat columns scroll - kept in sync with
// .hero-icon-cell's 42px and .hero-name-cell's 150px in styles.css.
const STICKY_WIDTH = 192;

// The last column of each scroll-snap group that has another group after
// it (Lvl/K/D/A/NW, Items, LH/DN/GPM/XPM - APM/Pings is last, so there's
// no next group's column to hide) - used to measure each group's natural
// width and, when it's narrower than the visible table, stretch it with
// extra padding so the next group's first column doesn't peek into view.
const GROUP_ENDS = ["nw", "items", "xpm"] as const;
type GroupEnd = (typeof GROUP_ENDS)[number];

export function Scoreboard({
  players,
  teamLabel,
  className,
  duration,
}: {
  players: MatchPlayer[];
  teamLabel: string;
  className: string;
  duration: number;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [extraPadding, setExtraPadding] = useState<Record<GroupEnd, number>>({
    nw: 0,
    items: 0,
    xpm: 0,
  });

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const measure = () => {
      // Reset first so a previous run's extra padding doesn't get baked
      // into this run's "natural" width measurement.
      setExtraPadding({ nw: 0, items: 0, xpm: 0 });
      requestAnimationFrame(() => {
        if (!tableRef.current) return;
        const starts = Array.from(tableRef.current.querySelectorAll<HTMLElement>(".scoreboard-group-start"));
        const ends = tableRef.current.querySelectorAll<HTMLElement>(".scoreboard-group-end");
        if (starts.length === 0 || ends.length === 0) return;

        const available = tableRef.current.clientWidth - STICKY_WIDTH;
        const groupStartOffsets = starts.map((el) => el.offsetLeft);

        const next: Record<GroupEnd, number> = { nw: 0, items: 0, xpm: 0 };
        ends.forEach((_endEl, i) => {
          const groupStart = groupStartOffsets[i];
          const groupEnd = groupStartOffsets[i + 1];
          if (groupStart == null || groupEnd == null) return;
          const naturalWidth = groupEnd - groupStart;
          // A couple of extra pixels of margin absorbs sub-pixel rounding
          // differences between offsetLeft (integer) and the fractional
          // positions the browser actually renders at - without it, a
          // sliver of the next group's first column can still peek in.
          const extra = available - naturalWidth + 2;
          const key = GROUP_ENDS[i];
          if (key && extra > 0) next[key] = extra;
        });
        setExtraPadding(next);
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, [players, duration]);

  return (
    <table className={`scoreboard ${className}`} ref={tableRef}>
      <thead>
        <tr>
          <th colSpan={2}>{teamLabel}</th>
          <th className="scoreboard-group-start">Lvl</th>
          <th className="scoreboard-kda-cell">K</th>
          <th className="scoreboard-kda-cell">D</th>
          <th className="scoreboard-kda-cell">A</th>
          <th className="scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.nw }}>
            NW
          </th>
          <th className="scoreboard-group-start scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.items }}>
            Items
          </th>
          <th className="scoreboard-group-start">LH</th>
          <th>DN</th>
          <th>GPM</th>
          <th className="scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.xpm }}>
            XPM
          </th>
          <th className="scoreboard-group-start">APM</th>
          <th>Pings</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => {
          const items = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5, p.item_neutral].filter(
            (id) => id,
          );
          const apm = computeApm(p.actions, duration);
          return (
            <tr key={p.player_slot}>
              <td className="hero-icon-cell">{heroIcon(p.hero_id) && <img src={heroIcon(p.hero_id)!} alt="" className="hero-icon" />}</td>
              <td className="hero-name-cell">
                <div title={heroName(p.hero_id)}>{heroName(p.hero_id)}</div>
                {(p.personaname || p.rank_tier) && (
                  <div className="player-meta text-dim small">
                    {p.personaname && (
                      <span className="player-name" title={p.personaname}>
                        {p.account_id ? <Link to={`/vs/${p.account_id}`}>{p.personaname}</Link> : p.personaname}
                      </span>
                    )}
                    {/* Rank never truncates with the name - it's the more
                        useful of the two when space is tight, so the name
                        is what shrinks first. */}
                    {p.rank_tier && (
                      <span className="player-rank">
                        {p.personaname ? " · " : ""}
                        <span style={{ color: rankTierColor(p.rank_tier) ?? undefined }}>{rankTierLabel(p.rank_tier)}</span>
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="scoreboard-group-start">{p.level}</td>
              <td className="scoreboard-kda-cell">{p.kills}</td>
              <td className="scoreboard-kda-cell">{p.deaths}</td>
              <td className="scoreboard-kda-cell">{p.assists}</td>
              <td className="scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.nw }}>
                {p.net_worth ?? "-"}
              </td>
              <td className="scoreboard-group-start scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.items }}>
                <div className="item-row">
                  {items.map((id, idx) => {
                    const img = itemImage(id);
                    return img ? <img key={idx} src={img} alt={itemName(id)} title={itemName(id)} className="item-icon" /> : null;
                  })}
                </div>
              </td>
              <td className="scoreboard-group-start">{p.last_hits}</td>
              <td>{p.denies}</td>
              <td>{p.gold_per_min}</td>
              <td className="scoreboard-group-end" style={{ paddingRight: 14 + extraPadding.xpm }}>
                {p.xp_per_min}
              </td>
              <td className="scoreboard-group-start">{apm ?? "-"}</td>
              <td>{p.pings ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
