import { pool } from "./db/client.js";
import { config } from "./config.js";
import { getMatchHistory, getMatchDetails, buildReplayUrl } from "./steam.js";
import { parseReplay } from "./parserClient.js";
import type { SteamMatchDetails } from "./types.js";

async function ensureAccount(accountId: number): Promise<void> {
  await pool.query(
    `INSERT INTO accounts (account_id) VALUES ($1) ON CONFLICT (account_id) DO NOTHING`,
    [accountId],
  );
}

async function matchAlreadyStored(matchId: number): Promise<boolean> {
  const res = await pool.query(`SELECT 1 FROM matches WHERE match_id = $1`, [matchId]);
  return (res.rowCount ?? 0) > 0;
}

async function storeMatch(details: SteamMatchDetails): Promise<void> {
  await pool.query(
    `INSERT INTO matches (match_id, start_time, duration, radiant_win, game_mode, lobby_type, cluster, replay_salt, replay_url, parse_status, match_details)
     VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
     ON CONFLICT (match_id) DO UPDATE SET match_details = EXCLUDED.match_details`,
    [
      details.match_id,
      details.start_time,
      details.duration,
      details.radiant_win,
      details.game_mode,
      details.lobby_type,
      details.cluster,
      details.replay_salt ?? null,
      buildReplayUrl(details),
      JSON.stringify(details),
    ],
  );

  for (const p of details.players) {
    await pool.query(
      `INSERT INTO match_players
        (match_id, player_slot, account_id, hero_id, kills, deaths, assists, last_hits, denies,
         gold_per_min, xp_per_min, level, net_worth, hero_damage, tower_damage, hero_healing,
         items, backpack, item_neutral, leaver_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (match_id, player_slot) DO UPDATE SET
         account_id = EXCLUDED.account_id, hero_id = EXCLUDED.hero_id`,
      [
        details.match_id,
        p.player_slot,
        p.account_id ?? null,
        p.hero_id,
        p.kills,
        p.deaths,
        p.assists,
        p.last_hits,
        p.denies,
        p.gold_per_min,
        p.xp_per_min,
        p.level,
        p.net_worth ?? null,
        p.hero_damage ?? null,
        p.tower_damage ?? null,
        p.hero_healing ?? null,
        [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5],
        [p.backpack_0 ?? 0, p.backpack_1 ?? 0, p.backpack_2 ?? 0],
        p.item_neutral ?? null,
        p.leaver_status,
      ],
    );
  }
}

async function parseAndStore(matchId: number, replayUrl: string | null): Promise<void> {
  if (!replayUrl) {
    await pool.query(`UPDATE matches SET parse_status = 'no_replay' WHERE match_id = $1`, [matchId]);
    return;
  }

  await pool.query(`UPDATE matches SET parse_status = 'parsing' WHERE match_id = $1`, [matchId]);

  const result = await parseReplay(replayUrl);

  if (result.status !== "parsed") {
    await pool.query(
      `UPDATE matches SET parse_status = 'failed', parse_error = $2 WHERE match_id = $1`,
      [matchId, result.error ?? "unknown error"],
    );
    return;
  }

  await pool.query(
    `UPDATE matches SET parse_status = 'parsed', parse_error = NULL, parsed_data = $2 WHERE match_id = $1`,
    [matchId, JSON.stringify(result.match ?? { rawLines: result.rawLines })],
  );
}

async function processNewMatch(matchId: number): Promise<void> {
  console.log(`[poller] fetching details for match ${matchId}`);
  const details = await getMatchDetails(matchId);
  await storeMatch(details);

  const replayUrl = buildReplayUrl(details);
  console.log(`[poller] parsing match ${matchId} (replay: ${replayUrl ?? "unavailable"})`);
  await parseAndStore(matchId, replayUrl);
}

async function pollAccount(accountId: number): Promise<void> {
  await ensureAccount(accountId);

  const history = await getMatchHistory(accountId, 25).catch((err) => {
    console.error(`[poller] GetMatchHistory failed for ${accountId}:`, (err as Error).message);
    return [];
  });

  // Oldest-first so match ordering / "last seen" bookkeeping stays sane.
  const newMatches = [...history].reverse();

  for (const m of newMatches) {
    if (await matchAlreadyStored(m.match_id)) continue;
    try {
      await processNewMatch(m.match_id);
    } catch (err) {
      console.error(`[poller] failed to process match ${m.match_id}:`, (err as Error).message);
    }
  }

  await pool.query(
    `UPDATE accounts SET last_polled_at = now(), last_match_id = GREATEST(COALESCE(last_match_id, 0), $2) WHERE account_id = $1`,
    [accountId, history[0]?.match_id ?? 0],
  );
}

export async function pollOnce(): Promise<void> {
  if (!config.steamApiKey) {
    console.warn("[poller] STEAM_API_KEY not set, skipping poll");
    return;
  }
  if (config.trackedAccountIds.length === 0) {
    console.warn("[poller] STEAM_ACCOUNT_IDS not set, skipping poll");
    return;
  }
  for (const accountId of config.trackedAccountIds) {
    await pollAccount(accountId).catch((err) =>
      console.error(`[poller] account ${accountId} poll failed:`, (err as Error).message),
    );
  }
}

export function startPoller(): void {
  const intervalMs = Math.max(config.pollIntervalSeconds, 30) * 1000;
  console.log(`[poller] starting, interval=${intervalMs / 1000}s, accounts=${config.trackedAccountIds.join(",")}`);
  pollOnce().catch((err) => console.error("[poller] initial poll failed:", err));
  setInterval(() => {
    pollOnce().catch((err) => console.error("[poller] poll failed:", err));
  }, intervalMs);
}
