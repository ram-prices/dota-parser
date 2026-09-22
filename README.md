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
