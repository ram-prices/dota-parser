import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getMatch, getParseStatus, OpenDotaError, requestParse } from "../opendota";
import { invalidate } from "../cache";
import type { MatchDetail as MatchDetailType } from "../types";
import { abilityById, formatDuration, formatGameTime, gameModeName, heroIcon, heroName, heroNameByUnit, isRadiant, itemByKey } from "../dota";
import { Scoreboard } from "../components/Scoreboard";
import { AdvantageChart } from "../components/AdvantageChart";

export function MatchDetail() {
  const { matchId } = useParams();
  const [data, setData] = useState<MatchDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [chatFilter, setChatFilter] = useState("");

  useEffect(() => {
    if (!matchId) return;
    setData(null);
    setError(null);
    getMatch(Number(matchId))
      .then(setData)
      .catch((e) => setError(e instanceof OpenDotaError ? e.message : String(e)));
  }, [matchId]);

  const isParsed = Boolean(data && (data.version || data.players?.[0]?.purchase_log));

  const purchases = useMemo(() => {
    if (!data) return [];
    return data.players
      .flatMap((p) => (p.purchase_log ?? []).map((log) => ({ ...log, player: p })))
      .sort((a, b) => a.time - b.time);
  }, [data]);

  const kills = useMemo(() => {
    if (!data) return [];
    return data.players
      .flatMap((p) => (p.kills_log ?? []).map((log) => ({ ...log, killer: p })))
      .sort((a, b) => a.time - b.time);
  }, [data]);

  const wards = useMemo(() => {
    if (!data) return [];
    return data.players
      .flatMap((p) => [
        ...(p.obs_log ?? []).map((log) => ({ ...log, player: p, kind: "Observer" as const })),
        ...(p.sen_log ?? []).map((log) => ({ ...log, player: p, kind: "Sentry" as const })),
      ])
      .sort((a, b) => a.time - b.time);
  }, [data]);

  const filteredChat = useMemo(() => {
    const chat = data?.chat ?? [];
    if (!chatFilter.trim()) return chat;
    const needle = chatFilter.toLowerCase();
    return chat.filter((c) => c.key?.toLowerCase().includes(needle));
  }, [data, chatFilter]);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <div className="loading">Loading match {matchId}...</div>;

  const radiant = data.players.filter((p) => p.isRadiant ?? isRadiant(p.player_slot));
  const dire = data.players.filter((p) => !(p.isRadiant ?? isRadiant(p.player_slot)));

  async function handleRequestParse() {
    if (!matchId) return;
    setRequesting(true);
    setRequestMsg("Asking OpenDota to parse this replay (only works if Valve still hosts it, ~8-14 days post-match)...");
    try {
      const jobId = await requestParse(Number(matchId));
      if (!jobId) {
        setRequestMsg("OpenDota didn't return a job id — it may already be parsed or queued. Try refreshing in a minute.");
        return;
      }
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const done = await getParseStatus(jobId);
        if (done) break;
      }
      invalidate(`match:${matchId}`);
      const fresh = await getMatch(Number(matchId));
      setData(fresh);
      setRequestMsg(fresh.players?.[0]?.purchase_log ? "Parsed!" : "Still processing — try refreshing in a bit.");
    } catch (e) {
      setRequestMsg(e instanceof OpenDotaError ? e.message : String(e));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div>
      <div className="match-header">
        <h2 className={data.radiant_win ? "radiant-won" : "dire-won"}>{data.radiant_win ? "Radiant Victory" : "Dire Victory"}</h2>
        <div className="match-meta">
          {formatDuration(data.duration)} &middot; {gameModeName(data.game_mode)} &middot; match {data.match_id}
        </div>
        {!isParsed && (
          <div className="error-box small">
            This match hasn't been parsed by OpenDota yet, so only basic stats are available.{" "}
            <button onClick={handleRequestParse} disabled={requesting}>
              {requesting ? "Requesting..." : "Request parse"}
            </button>
            {requestMsg && <div>{requestMsg}</div>}
          </div>
        )}
      </div>

      <Scoreboard players={radiant} teamLabel="Radiant" className="team-radiant" />
      <Scoreboard players={dire} teamLabel="Dire" className="team-dire" />

      {data.radiant_gold_adv && <AdvantageChart title="Gold advantage" values={data.radiant_gold_adv} />}
      {data.radiant_xp_adv && <AdvantageChart title="Experience advantage" values={data.radiant_xp_adv} />}

      {purchases.length > 0 && (
        <details className="section" open={false}>
          <summary>Item purchase timeline ({purchases.length})</summary>
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Player</th>
                <th>Item</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => {
                const item = itemByKey(p.key);
                return (
                  <tr key={i}>
                    <td>{formatGameTime(p.time)}</td>
                    <td>{heroName(p.player.hero_id)}</td>
                    <td className="hero-cell">
                      {item.img && <img src={item.img} alt="" className="item-icon" />}
                      {item.name}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      )}

      {kills.length > 0 && (
        <details className="section">
          <summary>Kill feed ({kills.length})</summary>
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Killer</th>
                <th>Victim</th>
              </tr>
            </thead>
            <tbody>
              {kills.map((k, i) => (
                <tr key={i}>
                  <td>{formatGameTime(k.time)}</td>
                  <td>{heroName(k.killer.hero_id)}</td>
                  <td>{heroNameByUnit(k.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {wards.length > 0 && (
        <details className="section">
          <summary>Ward placements ({wards.length})</summary>
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Player</th>
                <th>Type</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {wards.map((w, i) => (
                <tr key={i}>
                  <td>{formatGameTime(w.time)}</td>
                  <td>{heroName(w.player.hero_id)}</td>
                  <td>{w.kind}</td>
                  <td>
                    {w.x ?? "-"}, {w.y ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {data.players.some((p) => (p.ability_upgrades_arr ?? []).length > 0) && (
        <details className="section">
          <summary>Skill builds</summary>
          {data.players
            .filter((p) => (p.ability_upgrades_arr ?? []).length > 0)
            .map((p) => (
              <div key={p.player_slot} className="skill-build-row">
                <div className="hero-cell">
                  {heroIcon(p.hero_id) && <img src={heroIcon(p.hero_id)!} alt="" className="hero-icon" />}
                  {heroName(p.hero_id)}
                </div>
                <div className="skill-build-list">
                  {(p.ability_upgrades_arr ?? []).map((abilityId, i) => {
                    const a = abilityById(abilityId);
                    return (
                      <span key={i} className="skill-pill" title={`Level ${i + 1}: ${a.name}`}>
                        {a.img ? <img src={a.img} alt={a.name} /> : a.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
        </details>
      )}

      {data.chat && data.chat.length > 0 && (
        <details className="section" open={false}>
          <summary>Chat log ({data.chat.length})</summary>
          <input
            className="chat-filter"
            placeholder="Search chat..."
            value={chatFilter}
            onChange={(e) => setChatFilter(e.target.value)}
          />
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredChat.map((c, i) => (
                <tr key={i}>
                  <td>{formatGameTime(c.time)}</td>
                  <td>{c.type === "chatwheel" ? `[chat wheel: ${c.key}]` : c.key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="raw-toggle">
        <button onClick={() => setShowRaw((v) => !v)}>{showRaw ? "Hide" : "Show"} raw OpenDota match data</button>
        {showRaw && <pre className="raw-json">{JSON.stringify(data, null, 2)}</pre>}
      </div>
    </div>
  );
}
