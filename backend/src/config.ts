function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

// Accepts either a SteamID64 or a 32-bit account_id and normalizes to account_id.
export function toAccountId(raw: string): number {
  const n = BigInt(raw.trim());
  const STEAM64_BASE = 76561197960265728n;
  const accountId = n >= STEAM64_BASE ? n - STEAM64_BASE : n;
  return Number(accountId);
}

export const config = {
  steamApiKey: process.env.STEAM_API_KEY ?? "",
  trackedAccountIds: (process.env.STEAM_ACCOUNT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toAccountId),
  pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 300),
  databaseUrl: required("DATABASE_URL", "postgres://dota:dota@localhost:5432/dota_parser"),
  parserUrl: process.env.PARSER_URL ?? "http://localhost:5600",
  port: Number(process.env.PORT ?? 8080),
};
