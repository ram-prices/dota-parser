import { Router } from "express";
import { pool } from "./db/client.js";
import { config } from "./config.js";
import { extractPlayerTimeSeries, extractRadiantGoldXpAdvantage, extractAllKills } from "./matchView.js";

export const router = Router();

router.get("/status", async (_req, res) => {
  const accounts = await pool.query(
    `SELECT account_id, persona_name, last_match_id, last_polled_at FROM accounts ORDER BY account_id`,
  );
  const matchCount = await pool.query(`SELECT count(*) FROM matches`);
  res.json({
    trackedAccounts: config.trackedAccountIds,
    pollIntervalSeconds: config.pollIntervalSeconds,
    steamApiKeyConfigured: Boolean(config.steamApiKey),
    accounts: accounts.rows,
    totalMatches: Number(matchCount.rows[0].count),
  });
});

router.get("/accounts/:accountId/matches", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  const result = await pool.query(
    `SELECT m.match_id, m.start_time, m.duration, m.radiant_win, m.parse_status,
            mp.player_slot, mp.hero_id, mp.kills, mp.deaths, mp.assists,
            mp.last_hits, mp.denies, mp.gold_per_min, mp.xp_per_min, mp.items
     FROM match_players mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.account_id = $1
     ORDER BY m.start_time DESC
     LIMIT $2`,
    [accountId, limit],
  );

  const rows = result.rows.map((r) => ({
    ...r,
    won: r.player_slot < 128 ? r.radiant_win : !r.radiant_win,
  }));

  res.json({ matches: rows });
});

router.get("/matches/:matchId", async (req, res) => {
  const matchId = Number(req.params.matchId);

  const matchRes = await pool.query(`SELECT * FROM matches WHERE match_id = $1`, [matchId]);
  if (matchRes.rowCount === 0) {
    res.status(404).json({ error: "match not found" });
    return;
  }
  const match = matchRes.rows[0];

  const playersRes = await pool.query(
    `SELECT * FROM match_players WHERE match_id = $1 ORDER BY player_slot`,
    [matchId],
  );

  const parsed = match.parsed_data as Record<string, unknown> | null;

  res.json({
    match: {
      match_id: match.match_id,
      start_time: match.start_time,
      duration: match.duration,
      radiant_win: match.radiant_win,
      game_mode: match.game_mode,
      lobby_type: match.lobby_type,
      parse_status: match.parse_status,
      parse_error: match.parse_error,
    },
    players: playersRes.rows,
    deep: parsed
      ? {
          playerTimeSeries: extractPlayerTimeSeries(parsed),
          advantage: extractRadiantGoldXpAdvantage(parsed),
          kills: extractAllKills(parsed),
        }
      : null,
    raw: parsed ?? null,
  });
});

router.get("/matches", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const result = await pool.query(
    `SELECT match_id, start_time, duration, radiant_win, parse_status FROM matches ORDER BY start_time DESC LIMIT $1`,
    [limit],
  );
  res.json({ matches: result.rows });
});
