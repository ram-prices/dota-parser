import { Link } from "react-router-dom";
import type { MatchPlayer } from "../types";
import { computeApm, heroIcon, heroName, itemImage, itemName, rankTierLabel } from "../dota";

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
  return (
    <table className={`scoreboard ${className}`}>
      <thead>
        <tr>
          <th colSpan={2}>{teamLabel}</th>
          <th className="scoreboard-group-start">Lvl</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>NW</th>
          <th className="scoreboard-group-start">Items</th>
          <th className="scoreboard-group-start">LH</th>
          <th>DN</th>
          <th>GPM</th>
          <th>XPM</th>
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
                        {rankTierLabel(p.rank_tier)}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="scoreboard-group-start">{p.level}</td>
              <td>{p.kills}</td>
              <td>{p.deaths}</td>
              <td>{p.assists}</td>
              <td>{p.net_worth ?? "-"}</td>
              <td className="scoreboard-group-start">
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
              <td>{p.xp_per_min}</td>
              <td className="scoreboard-group-start">{apm ?? "-"}</td>
              <td>{p.pings ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
