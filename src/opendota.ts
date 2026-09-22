import { getApiKey } from "./settings";
import { cached, cachedForever } from "./cache";
import type { HeroStat, MatchDetail, MatchSummary, PeerStat, PlayerProfile, WinLoss } from "./types";

const BASE = "https://api.opendota.com/api";

export class OpenDotaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const apiKey = getApiKey();
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const res = await fetch(url);
  if (res.status === 429) {
    throw new OpenDotaError(
      "OpenDota rate limit hit (60/min or daily cap). Wait a bit, or add a free API key in Settings for a higher limit.",
      429,
    );
  }
  if (!res.ok) {
    throw new OpenDotaError(`OpenDota request failed: ${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

// Lists change as you play, so cache them briefly rather than forever.
const LIST_TTL_MS = 5 * 60 * 1000;

export function getProfile(accountId: number): Promise<PlayerProfile> {
  return cached(`profile:${accountId}`, LIST_TTL_MS, () => get<PlayerProfile>(`/players/${accountId}`));
}

export function getWinLoss(accountId: number, params: Record<string, string | number> = {}): Promise<WinLoss> {
  const key = `wl:${accountId}:${JSON.stringify(params)}`;
  return cached(key, LIST_TTL_MS, () => get<WinLoss>(`/players/${accountId}/wl`, params));
}

export function getMatches(
  accountId: number,
  params: Record<string, string | number> = { limit: 30 },
): Promise<MatchSummary[]> {
  const key = `matches:${accountId}:${JSON.stringify(params)}`;
  return cached(key, LIST_TTL_MS, () => get<MatchSummary[]>(`/players/${accountId}/matches`, params));
}

export function getHeroStats(accountId: number): Promise<HeroStat[]> {
  return cached(`heroes:${accountId}`, LIST_TTL_MS, () => get<HeroStat[]>(`/players/${accountId}/heroes`));
}

export function getPeers(accountId: number): Promise<PeerStat[]> {
  return cached(`peers:${accountId}`, LIST_TTL_MS, () => get<PeerStat[]>(`/players/${accountId}/peers`));
}

// A match's parsed data never changes once OpenDota has parsed it, so this
// is cached forever (until the user explicitly clears the cache).
export function getMatch(matchId: number): Promise<MatchDetail> {
  return cachedForever(`match:${matchId}`, () => get<MatchDetail>(`/matches/${matchId}`));
}

// Asks OpenDota to (re-)parse a match's replay. Only works while Valve
// still hosts the replay (roughly 8-14 days after the match ends).
// Returns a job id you can poll via getParseStatus.
export async function requestParse(matchId: number): Promise<number | null> {
  const url = new URL(`${BASE}/request/${matchId}`);
  const apiKey = getApiKey();
  if (apiKey) url.searchParams.set("api_key", apiKey);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new OpenDotaError(`Parse request failed: ${res.status}`, res.status);
  const body = (await res.json()) as { job?: { jobId?: number } };
  return body.job?.jobId ?? null;
}

export async function getParseStatus(jobId: number): Promise<boolean> {
  // OpenDota returns an empty body/array once the job has finished.
  const url = new URL(`${BASE}/request/${jobId}`);
  const res = await fetch(url);
  if (!res.ok) return true;
  const body = await res.json().catch(() => null);
  const stillQueued = body && typeof body === "object" && Object.keys(body).length > 0;
  return !stillQueued;
}
