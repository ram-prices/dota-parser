import type { AccountMatchRow, MatchDetailResponse, StatusResponse } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  status: () => getJson<StatusResponse>("/status"),
  accountMatches: (accountId: number, limit = 20) =>
    getJson<{ matches: AccountMatchRow[] }>(`/accounts/${accountId}/matches?limit=${limit}`),
  match: (matchId: number) => getJson<MatchDetailResponse>(`/matches/${matchId}`),
};
