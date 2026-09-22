import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { MatchDetailResponse } from "../types";
import { formatDuration, isRadiant } from "../dota";
import { Scoreboard } from "../components/Scoreboard";
import { AdvantageChart } from "../components/AdvantageChart";

export function MatchDetail() {
  const { matchId } = useParams();
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    api
      .match(Number(matchId))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [matchId]);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  const radiant = data.players.filter((p) => isRadiant(p.player_slot));
  const dire = data.players.filter((p) => !isRadiant(p.player_slot));

  return (
    <div>
      <div className="match-header">
        <h2 className={data.match.radiant_win ? "radiant-won" : "dire-won"}>
          {data.match.radiant_win ? "Radiant Victory" : "Dire Victory"}
        </h2>
        <div className="match-meta">
          {formatDuration(data.match.duration)} &middot; match {data.match.match_id} &middot;{" "}
          <span className={`badge badge-${data.match.parse_status}`}>{data.match.parse_status}</span>
        </div>
        {data.match.parse_status === "failed" && (
          <div className="error-box small">
            In-depth parsing failed for this match: {data.match.parse_error}. Basic scoreboard stats below still
            come straight from Steam.
          </div>
        )}
        {data.match.parse_status === "no_replay" && (
          <div className="error-box small">
            No replay was available for this match (too old, or Valve never published it), so only the basic
            scoreboard from Steam is shown.
          </div>
        )}
      </div>

      <Scoreboard players={radiant} teamLabel="Radiant" className="team-radiant" />
      <Scoreboard players={dire} teamLabel="Dire" className="team-dire" />

      {data.deep && (
        <>
          <AdvantageChart title="Gold advantage" values={data.deep.advantage.gold_adv} />
          <AdvantageChart title="Experience advantage" values={data.deep.advantage.xp_adv} />
        </>
      )}

      <div className="raw-toggle">
        <button onClick={() => setShowRaw((v) => !v)}>{showRaw ? "Hide" : "Show"} raw parser data</button>
        {showRaw && <pre className="raw-json">{JSON.stringify(data.raw, null, 2)}</pre>}
      </div>
    </div>
  );
}
