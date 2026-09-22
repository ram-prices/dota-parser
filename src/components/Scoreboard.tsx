import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MatchPlayer } from "../types";
import { computeApm, heroIcon, heroName, itemImage, itemName, rankTierColor, rankTierLabel, unitDisplayName } from "../dota";

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

function itemIdsFor(entity: { item_0: number; item_1: number; item_2: number; item_3: number; item_4: number; item_5: number; item_neutral?: number }): number[] {
  return [entity.item_0, entity.item_1, entity.item_2, entity.item_3, entity.item_4, entity.item_5, entity.item_neutral].filter(
    (id): id is number => Boolean(id),
  );
}

// Normally just the hero's own items, but a player with a persistent
// controllable summon that carries its own inventory (currently only
// Lone Druid's Spirit Bear) gets its items appended in the same cell,
// after a thin divider - rather than a whole separate row, since there's
// no other bear-specific stat (kills/damage/etc) to justify one; OpenDota
// folds the whole "unit complex"'s performance into the hero's own row.
function ItemGroups({ player }: { player: MatchPlayer }) {
  const groups = [
    { key: "self", label: undefined as string | undefined, ids: itemIdsFor(player) },
    ...(player.additional_units ?? []).map((unit) => ({
      key: unit.unitname,
      label: unitDisplayName(unit.unitname),
      ids: itemIdsFor(unit),
    })),
  ];

  return (
    <div className="item-row">
      {groups.map((group, i) => (
        <div className="item-row-group" key={group.key}>
          {i > 0 && <span className="item-row-divider" title={`${group.label} inventory`} />}
          {group.ids.map((id, idx) => {
            const img = itemImage(id);
            return img ? <img key={idx} src={img} alt={itemName(id)} title={group.label ? `${group.label}: ${itemName(id)}` : itemName(id)} className="item-icon" /> : null;
          })}
        </div>
      ))}
    </div>
  );
}

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
          const apm = computeApm(p.actions, duration);
          return (
            <tr key={p.player_slot}>
              <td className="hero-icon-cell">{heroIcon(p.hero_id) && <img src={heroIcon(p.hero_id)!} alt="" className="hero-icon" />}</td>
              <td className="hero-name-cell">
                <div title={heroName(p.hero_id)}>{heroName(p.hero_id)}</div>
                {(p.personaname || p.rank_tier) && (
                  <div className="player-meta text-dim small">
                    {p.personaname && (
                      <div className="player-name" title={p.personaname}>
                        {p.account_id ? <Link to={`/vs/${p.account_id}`}>{p.personaname}</Link> : p.personaname}
                      </div>
                    )}
                    {/* Own line rather than inline after the name - always
                        rendered (blank when there's no rank) so every
                        row's height stays the same regardless of whether
                        that particular player has a visible rank. */}
                    <div className="player-rank">
                      {p.rank_tier ? (
                        <span style={{ color: rankTierColor(p.rank_tier) ?? undefined }}>{rankTierLabel(p.rank_tier)}</span>
                      ) : (
                        " "
                      )}
                    </div>
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
                <ItemGroups player={p} />
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
