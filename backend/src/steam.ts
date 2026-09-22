import { config } from "./config.js";
import type { SteamMatchHistoryEntry, SteamMatchDetails } from "./types.js";

const BASE = "https://api.steampowered.com";

class SteamApiError extends Error {}

async function steamGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("key", config.steamApiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SteamApiError(`Steam API ${path} failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { result: T };
  return json.result;
}

// Recent matches for one account, newest first. Only returns matches Valve has
// already committed to match history (i.e. finished games), so simple polling
// naturally catches "a game I just finished".
export async function getMatchHistory(accountId: number, matchesRequested = 25) {
  const result = await steamGet<{ status: number; num_results: number; matches: SteamMatchHistoryEntry[] }>(
    "/IDOTA2Match_570/GetMatchHistory/v1/",
    { account_id: accountId, matches_requested: matchesRequested },
  );
  return result.matches ?? [];
}

export async function getMatchDetails(matchId: number): Promise<SteamMatchDetails> {
  return steamGet<SteamMatchDetails>("/IDOTA2Match_570/GetMatchDetails/v1/", { match_id: matchId });
}

// Builds the same replay download URL the Dota 2 client uses. `cluster` and
// `replay_salt` come from GetMatchDetails; replays are only on Valve's CDN
// for a limited window after the match ends (longer with Dota Plus), which
// is why we poll frequently instead of backfilling old matches.
export function buildReplayUrl(details: SteamMatchDetails): string | null {
  if (!details.replay_salt || !details.cluster) return null;
  return `http://replay${details.cluster}.valve.net/570/${details.match_id}_${details.replay_salt}.dem.bz2`;
}
