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

const STAT_LABELS: Record<"networth_t" | "xp_t" | "lh_t" | "dn_t", string> = {
  networth_t: "Net worth",
  xp_t: "Experience",
  lh_t: "Last hits",
  dn_t: "Denies",
};

// Every stat on its own line - no column width to run out of, so this
// never needs horizontal scrolling at any screen size.
function PlayerStatCard({ player }: { player: MatchPlayer }) {
  return (
    <div className="lane-h2h-card">
      <div className="hero-cell">
        {heroIcon(player.hero_id) && <img src={heroIcon(player.hero_id)!} alt="" className="hero-icon" />}
        {heroName(player.hero_id)}
      </div>
      <div className="lane-h2h-stats">
        {(["networth_t", "xp_t", "lh_t", "dn_t"] as const).map((field) => (
          <div className="lane-h2h-stat" key={field}>
            <span className="text-dim">{STAT_LABELS[field]}</span>
            <span>{statAt10(player, field)?.toLocaleString() ?? "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneHeadToHead({ radiantPlayers, direPlayers }: { radiantPlayers: MatchPlayer[]; direPlayers: MatchPlayer[] }) {
  return (
    <div className="lane-h2h">
      {radiantPlayers.length > 0 && (
        <div className="lane-h2h-team">
          <div className="lane-h2h-team-label text-radiant">Radiant</div>
          {radiantPlayers.map((p) => (
            <PlayerStatCard key={p.player_slot} player={p} />
          ))}
        </div>
      )}
      {direPlayers.length > 0 && (
        <div className="lane-h2h-team">
          <div className="lane-h2h-team-label text-dire">Dire</div>
          {direPlayers.map((p) => (
            <PlayerStatCard key={p.player_slot} player={p} />
          ))}
        </div>
      )}
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
