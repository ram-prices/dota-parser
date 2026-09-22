// Defensively pulls the "in-depth" bits out of whatever the parser gave us.
// The parser's exact field names can drift between versions, so every read
// here is optional-chained; the raw payload is always returned alongside so
// the frontend can fall back to a raw viewer for anything we fail to map.

type AnyRecord = Record<string, unknown>;

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function extractPlayerTimeSeries(parsed: AnyRecord | null | undefined) {
  const players = asArray(parsed?.players) as AnyRecord[];
  return players.map((p) => ({
    player_slot: p.player_slot as number | undefined,
    account_id: p.account_id as number | undefined,
    hero_id: p.hero_id as number | undefined,
    gold_t: asArray(p.gold_t) as number[],
    xp_t: asArray(p.xp_t) as number[],
    lh_t: asArray(p.lh_t) as number[],
    purchase_log: asArray(p.purchase_log),
    kills_log: asArray(p.kills_log),
    buyback_log: asArray(p.buyback_log),
    runes_log: asArray(p.runes_log),
    obs_log: asArray(p.obs_log),
    sen_log: asArray(p.sen_log),
  }));
}

export function extractRadiantGoldXpAdvantage(parsed: AnyRecord | null | undefined) {
  const series = extractPlayerTimeSeries(parsed);
  if (series.length === 0) return { gold_adv: [], xp_adv: [] };

  const maxLen = Math.max(...series.map((s) => s.gold_t.length), 0);
  const gold_adv: number[] = [];
  const xp_adv: number[] = [];

  for (let i = 0; i < maxLen; i++) {
    let g = 0;
    let x = 0;
    for (const s of series) {
      // player_slot 0-4 = radiant, 128-132 = dire (Valve's slot convention)
      const isRadiant = (s.player_slot ?? 0) < 128;
      const sign = isRadiant ? 1 : -1;
      g += sign * (s.gold_t[i] ?? s.gold_t[s.gold_t.length - 1] ?? 0);
      x += sign * (s.xp_t[i] ?? s.xp_t[s.xp_t.length - 1] ?? 0);
    }
    gold_adv.push(g);
    xp_adv.push(x);
  }

  return { gold_adv, xp_adv };
}

export function extractAllKills(parsed: AnyRecord | null | undefined) {
  const kills = asArray(parsed?.kills_log ?? parsed?.objectives);
  if (kills.length > 0) return kills;
  // fall back to merging each player's own kills_log
  return extractPlayerTimeSeries(parsed).flatMap((s) => s.kills_log);
}
