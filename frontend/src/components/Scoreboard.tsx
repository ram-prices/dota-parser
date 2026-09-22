import { Link } from "react-router-dom";
import type { MatchPlayerRow } from "../types";
import { heroIcon, heroName, itemImage, itemName } from "../dota";

export function Scoreboard({ players, teamLabel, className }: { players: MatchPlayerRow[]; teamLabel: string; className: string }) {
  return (
    <table className={`scoreboard ${className}`}>
      <thead>
        <tr>
          <th colSpan={2}>{teamLabel}</th>
          <th>Lvl</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>LH</th>
          <th>DN</th>
          <th>GPM</th>
          <th>XPM</th>
          <th>Net Worth</th>
          <th>Items</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr key={p.player_slot}>
            <td className="hero-icon-cell">
              {heroIcon(p.hero_id) && <img src={heroIcon(p.hero_id)!} alt="" className="hero-icon" />}
            </td>
            <td className="hero-name-cell">
              {p.account_id ? (
                <Link to={`/player/${p.account_id}`}>{heroName(p.hero_id)}</Link>
              ) : (
                heroName(p.hero_id)
              )}
            </td>
            <td>{p.level}</td>
            <td>{p.kills}</td>
            <td>{p.deaths}</td>
            <td>{p.assists}</td>
            <td>{p.last_hits}</td>
            <td>{p.denies}</td>
            <td>{p.gold_per_min}</td>
            <td>{p.xp_per_min}</td>
            <td>{p.net_worth ?? "-"}</td>
            <td>
              <div className="item-row">
                {[...p.items, ...(p.item_neutral ? [p.item_neutral] : [])]
                  .filter((id) => id)
                  .map((id, idx) => {
                    const img = itemImage(id);
                    return img ? (
                      <img key={idx} src={img} alt={itemName(id)} title={itemName(id)} className="item-icon" />
                    ) : null;
                  })}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
