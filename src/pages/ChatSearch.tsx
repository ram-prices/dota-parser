import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MatchDetail } from "../types";
import { formatGameTime, formatRelativeTime } from "../dota";

interface CachedMatch {
  matchId: number;
  data: MatchDetail;
}

function loadCachedMatches(): CachedMatch[] {
  const results: CachedMatch[] = [];
  for (const key of Object.keys(localStorage)) {
    const prefix = "dota-dash:match:";
    if (!key.startsWith(prefix)) continue;
    try {
      const envelope = JSON.parse(localStorage.getItem(key)!) as { data: MatchDetail };
      const matchId = Number(key.slice(prefix.length));
      if (envelope?.data) results.push({ matchId, data: envelope.data });
    } catch {
      // skip corrupt entry
    }
  }
  return results.sort((a, b) => (b.data.start_time ?? 0) - (a.data.start_time ?? 0));
}

export function ChatSearch() {
  const [query, setQuery] = useState("");
  const cachedMatches = useMemo(loadCachedMatches, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.toLowerCase();
    return cachedMatches.flatMap(({ matchId, data }) =>
      (data.chat ?? [])
        .filter((c) => c.type === "chat" && c.key?.toLowerCase().includes(needle))
        .map((c) => ({ matchId, startTime: data.start_time, entry: c })),
    );
  }, [cachedMatches, query]);

  return (
    <div>
      <h2>Chat search</h2>
      <p className="text-dim">
        Searches chat logs from matches you've already opened (cached in this browser) — {cachedMatches.length}{" "}
        matches cached so far. Open more match pages to widen the search.
      </p>
      <input className="chat-filter" placeholder="Search for a word or phrase..." value={query} onChange={(e) => setQuery(e.target.value)} />

      {query.trim() && (
        <table className="log-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>When</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>
                  <Link to={`/matches/${r.matchId}`}>{r.matchId}</Link>
                </td>
                <td>{r.startTime ? formatRelativeTime(r.startTime) : "-"}</td>
                <td>{formatGameTime(r.entry.time)}</td>
                <td>{r.entry.key}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={4} className="text-dim">
                  No matches found in cached chat logs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
