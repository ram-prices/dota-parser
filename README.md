# Match data (this branch)

This branch is separate from `main` on purpose: `main` holds the dashboard's
app code, this branch holds the actual exported match data, so cloning the
app doesn't mean downloading thousands of match files too.

## Layout

```
matches/<last two digits of match_id>/<match_id>.json
```

Sharded by the last two digits of the match_id so no single folder ends up
with thousands of entries. Each file is the raw response from OpenDota's
`GET /matches/{match_id}` for that match, minified (not pretty-printed) to
keep size down - it's a straight snapshot of whatever OpenDota had at
export time, not a bespoke format.

Populated and kept up to date by `.github/workflows/export-matches.yml` on
the `main` branch. The dashboard reads files from here first (via
`raw.githubusercontent.com`) and only calls OpenDota's live API for a match
that isn't here yet.

## `matches-index.json`

The lightweight per-match summary list for the account (kills/deaths/
duration/hero_id/game_mode/etc - not the full match detail, just what
OpenDota's `GET /players/{account_id}/matches` returns), newest match
first. This is what the dashboard's Matches list, Trends and win/loss
count read instead of calling that endpoint live on every page load.

Written by `export-matches.yml` (a full refresh each run) and kept current
between those runs by `request-parse.yml` (merges in whatever its own
20-minute new-match check just fetched - no extra API call for it).
