import type { MatchDetail } from "../types";
import { LANE_CUTOFF_MINUTE, laneMatchups, valueAtMinute, type LaneOutcome } from "../dota";
import { Scoreboard } from "./Scoreboard";

function outcomeLabel(outcome: LaneOutcome | null): string {
  if (outcome === "won") return "Radiant won";
  if (outcome === "lost") return "Dire won";
  if (outcome === "draw") return "Even lane";
  return "No lane data";
}

function CompareBar({ label, radiant, dire }: { label: string; radiant: number; dire: number }) {
  const total = radiant + dire;
  const radiantPct = total > 0 ? Math.round((radiant / total) * 100) : 50;
  return (
    <div className="lane-compare">
      <div className="lane-compare-values">
        <span className="lane-compare-radiant">{radiant.toLocaleString()}</span>
        <span className="lane-compare-label">{label} @{LANE_CUTOFF_MINUTE}min</span>
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
                <div className="lane-scoreboards">
                  {m.radiantPlayers.length > 0 ? (
                    <Scoreboard players={m.radiantPlayers} teamLabel="Radiant" className="team-radiant" duration={detail.duration} />
                  ) : (
                    <p className="text-dim small">No Radiant player here.</p>
                  )}
                  {m.direPlayers.length > 0 ? (
                    <Scoreboard players={m.direPlayers} teamLabel="Dire" className="team-dire" duration={detail.duration} />
                  ) : (
                    <p className="text-dim small">No Dire player here.</p>
                  )}
                </div>

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
