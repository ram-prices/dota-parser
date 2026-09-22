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

const STAT_FIELDS = ["networth_t", "xp_t", "lh_t", "dn_t"] as const;
const STAT_SHORT_LABELS: Record<(typeof STAT_FIELDS)[number], string> = {
  networth_t: "NW",
  xp_t: "XP",
  lh_t: "LH",
  dn_t: "DN",
};

function HeroHeader({ player }: { player: MatchPlayer | undefined }) {
  if (!player) return <th className="lane-h2h-table-hero">-</th>;
  return (
    <th className="lane-h2h-table-hero">
      <div className="hero-cell">
        {heroIcon(player.hero_id) && <img src={heroIcon(player.hero_id)!} alt="" className="hero-icon" />}
        {heroName(player.hero_id)}
      </div>
    </th>
  );
}

// A 3-column table per lane pairing - value, stat label, value - so it
// stays narrow enough to never need horizontal scrolling regardless of
// screen size, with one row per stat instead of one column per stat.
function PairTable({ radiant, dire }: { radiant: MatchPlayer | undefined; dire: MatchPlayer | undefined }) {
  return (
    <table className="lane-h2h-table">
      <thead>
        <tr>
          <HeroHeader player={radiant} />
          <th />
          <HeroHeader player={dire} />
        </tr>
      </thead>
      <tbody>
        {STAT_FIELDS.map((field) => (
          <tr key={field}>
            <td className="lane-h2h-table-value">{statAt10(radiant, field)?.toLocaleString() ?? "-"}</td>
            <td className="lane-h2h-table-label">{STAT_SHORT_LABELS[field]}</td>
            <td className="lane-h2h-table-value">{statAt10(dire, field)?.toLocaleString() ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LaneHeadToHead({ radiantPlayers, direPlayers }: { radiantPlayers: MatchPlayer[]; direPlayers: MatchPlayer[] }) {
  const rows = Math.max(radiantPlayers.length, direPlayers.length);
  return (
    <div className="lane-h2h">
      {Array.from({ length: rows }, (_, i) => (
        <PairTable key={i} radiant={radiantPlayers[i]} dire={direPlayers[i]} />
      ))}
    </div>
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
