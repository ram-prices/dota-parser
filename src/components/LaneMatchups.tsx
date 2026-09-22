import type { MatchDetail, MatchPlayer } from "../types";
import { LANE_CUTOFF_MINUTE, heroIcon, heroName, laneMatchups, valueAtMinute, type LaneOutcome } from "../dota";

function outcomeLabel(outcome: LaneOutcome | null): string {
  if (outcome === "won") return "Radiant won";
  if (outcome === "lost") return "Dire won";
  if (outcome === "draw") return "Even lane";
  return "No lane data";
}

function statAt10(player: MatchPlayer | undefined, field: "networth_t" | "xp_t" | "lh_t" | "dn_t"): number | null {
  if (!player) return null;
  const fromArray = valueAtMinute(player[field], LANE_CUTOFF_MINUTE);
  if (fromArray != null) return fromArray;
  // lh_t/dn_t aren't always present on unparsed matches - fall back to the
  // match-final count rather than showing nothing.
  if (field === "lh_t") return player.last_hits;
  if (field === "dn_t") return player.denies;
  return null;
}

function StatCell({ value }: { value: number | null }) {
  return <td className="lane-h2h-stat">{value != null ? value.toLocaleString() : "-"}</td>;
}

function HeroCell({ player }: { player: MatchPlayer | undefined }) {
  if (!player) return <td className="lane-h2h-hero" />;
  return (
    <td className="lane-h2h-hero">
      <div className="hero-cell">
        {heroIcon(player.hero_id) && <img src={heroIcon(player.hero_id)!} alt="" className="hero-icon" />}
        {heroName(player.hero_id)}
      </div>
    </td>
  );
}

// One row per lane "slot" - Radiant's stats read outward-in from the left,
// Dire's mirror them reading outward-in from the right, so both sides'
// numbers sit next to the shared divider for an easy side-by-side compare.
function LaneHeadToHead({ radiantPlayers, direPlayers }: { radiantPlayers: MatchPlayer[]; direPlayers: MatchPlayer[] }) {
  const rows = Math.max(radiantPlayers.length, direPlayers.length);
  return (
    <table className="lane-h2h">
      <thead>
        <tr>
          <th className="lane-h2h-hero-col text-radiant">Radiant</th>
          <th>NW</th>
          <th>XP</th>
          <th>LH</th>
          <th>DN</th>
          <th className="lane-h2h-divider-col" aria-hidden="true" />
          <th>DN</th>
          <th>LH</th>
          <th>XP</th>
          <th>NW</th>
          <th className="lane-h2h-hero-col text-dire">Dire</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => {
          const r = radiantPlayers[i];
          const d = direPlayers[i];
          return (
            <tr key={i}>
              <HeroCell player={r} />
              <StatCell value={statAt10(r, "networth_t")} />
              <StatCell value={statAt10(r, "xp_t")} />
              <StatCell value={statAt10(r, "lh_t")} />
              <StatCell value={statAt10(r, "dn_t")} />
              <td className="lane-h2h-divider-col" aria-hidden="true" />
              <StatCell value={statAt10(d, "dn_t")} />
              <StatCell value={statAt10(d, "lh_t")} />
              <StatCell value={statAt10(d, "xp_t")} />
              <StatCell value={statAt10(d, "networth_t")} />
              <HeroCell player={d} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CompareBar({ label, radiant, dire }: { label: string; radiant: number; dire: number }) {
  const total = radiant + dire;
  const radiantPct = total > 0 ? Math.round((radiant / total) * 100) : 50;
  return (
    <div className="lane-compare">
      <div className="lane-compare-values">
        <span className="lane-compare-radiant">{radiant.toLocaleString()}</span>
        <span className="lane-compare-label">
          {label} @{LANE_CUTOFF_MINUTE}min
        </span>
        <span className="lane-compare-dire">{dire.toLocaleString()}</span>
      </div>
      <div className="lane-compare-track">
        <div className="lane-compare-fill-radiant" style={{ width: `${radiantPct}%` }} />
        <div className="lane-compare-fill-dire" style={{ width: `${100 - radiantPct}%` }} />
      </div>
    </div>
  );
}

export function LaneMatchups({ detail }: { detail: MatchDetail }) {
  const matchups = laneMatchups(detail);

  return (
    <div className="lane-matchups">
      {matchups.map((m) => {
        const hasData = m.radiantPlayers.length > 0 || m.direPlayers.length > 0;
        const radiantNetWorth = m.radiantPlayers.reduce((sum, p) => sum + (valueAtMinute(p.networth_t, LANE_CUTOFF_MINUTE) ?? 0), 0);
        const direNetWorth = m.direPlayers.reduce((sum, p) => sum + (valueAtMinute(p.networth_t, LANE_CUTOFF_MINUTE) ?? 0), 0);
        const radiantXp = m.radiantPlayers.reduce((sum, p) => sum + (valueAtMinute(p.xp_t, LANE_CUTOFF_MINUTE) ?? 0), 0);
        const direXp = m.direPlayers.reduce((sum, p) => sum + (valueAtMinute(p.xp_t, LANE_CUTOFF_MINUTE) ?? 0), 0);

        return (
          <div key={m.lane} className="lane-card">
            <div className="lane-card-header">
              <h4>{m.label}</h4>
              <span className={`lane-outcome-pill lane-outcome-${m.outcome ?? "none"}`}>{outcomeLabel(m.outcome)}</span>
            </div>

            {!hasData ? (
              <p className="text-dim small">No lane data for this match.</p>
            ) : (
              <>
                <LaneHeadToHead radiantPlayers={m.radiantPlayers} direPlayers={m.direPlayers} />

                {m.outcome && (
                  <>
                    <CompareBar label="Net worth" radiant={radiantNetWorth} dire={direNetWorth} />
                    <CompareBar label="Experience" radiant={radiantXp} dire={direXp} />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
