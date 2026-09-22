const ACCOUNT_ID_KEY = "dota-dash:settings:accountId";
const API_KEY_KEY = "dota-dash:settings:apiKey";

const STEAM64_BASE = 76561197960265728n;

// Accepts a SteamID64, a 32-bit account_id, or a full Steam profile URL
// (https://steamcommunity.com/profiles/7656119...) and returns the
// 32-bit account_id OpenDota's API expects.
export function parseAccountId(raw: string): number | null {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d+)/);
  const idStr = urlMatch ? urlMatch[1] : trimmed;

  if (!/^\d+$/.test(idStr)) return null;
  const n = BigInt(idStr);
  const accountId = n >= STEAM64_BASE ? n - STEAM64_BASE : n;
  if (accountId <= 0n || accountId > 4294967295n) return null;
  return Number(accountId);
}

export function getAccountId(): number | null {
  const stored = localStorage.getItem(ACCOUNT_ID_KEY);
  if (stored) return Number(stored);
  const buildDefault = import.meta.env.VITE_DEFAULT_ACCOUNT_ID;
  if (buildDefault) return parseAccountId(buildDefault);
  return null;
}

export function setAccountId(accountId: number): void {
  localStorage.setItem(ACCOUNT_ID_KEY, String(accountId));
}

export function clearAccountId(): void {
  localStorage.removeItem(ACCOUNT_ID_KEY);
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_KEY) || import.meta.env.VITE_OPENDOTA_API_KEY || null;
}

export function setApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_KEY, key);
  else localStorage.removeItem(API_KEY_KEY);
}
