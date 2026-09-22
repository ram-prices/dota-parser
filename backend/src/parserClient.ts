import { config } from "./config.js";

export interface ParseResult {
  status: "parsed" | "no_replay" | "failed";
  error?: string;
  // Full decoded match summary from the parser's "epilogue" entry, if we
  // could find and decode one. This is the rich, Dotabuff-style payload:
  // per-player gold_t/xp_t/lh_t time series, purchase_log, kills_log,
  // runes_log, obs_log/sen_log (wards), buyback_log, etc.
  match?: Record<string, unknown>;
  // Every line the parser streamed back, kept verbatim so nothing is lost
  // even if the shape above doesn't match what we expected for this build
  // of the parser (the exact field names have drifted across Dota patches).
  rawLines?: unknown[];
}

// Sends the parser (odota/parser, the same open-source demo parser behind
// OpenDota's in-depth match pages) a URL to fetch and parse. The parser
// downloads the replay itself (it handles the .dem.bz2 decompression), so
// we never have to touch the binary demo format ourselves.
export async function parseReplay(replayUrl: string): Promise<ParseResult> {
  const url = new URL("/blob", config.parserUrl);
  url.searchParams.set("replay_url", replayUrl);

  let res: Response;
  try {
    // Large replays can take several minutes to download+parse.
    res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15 * 60 * 1000) });
  } catch (err) {
    return { status: "failed", error: `parser request failed: ${(err as Error).message}` };
  }

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    return { status: "failed", error: `parser HTTP ${res.status}: ${body.slice(0, 500)}` };
  }

  const text = await res.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawLines: unknown[] = [];
  let epilogue: Record<string, unknown> | undefined;

  for (const line of lines) {
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // skip any non-JSON noise line
    }
    rawLines.push(obj);

    if (obj && typeof obj === "object" && (obj as { type?: string }).type === "epilogue") {
      const record = obj as { key?: unknown };
      if (typeof record.key === "string") {
        try {
          epilogue = JSON.parse(record.key);
        } catch {
          // "key" wasn't JSON text after all; fall through to raw-object case below
        }
      }
      if (!epilogue && typeof record.key === "object" && record.key) {
        epilogue = record.key as Record<string, unknown>;
      }
      if (!epilogue) {
        epilogue = obj as Record<string, unknown>;
      }
    }
  }

  if (rawLines.length === 0) {
    return { status: "failed", error: "parser returned no output" };
  }

  return { status: "parsed", match: epilogue, rawLines };
}
