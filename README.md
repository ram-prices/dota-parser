# Dota Stats Dashboard

A personal, Dotabuff/OpenDota-style stats dashboard for your own Dota 2
matches — plus a few views neither of those sites gives you out of the box
(custom trend charts, a searchable chat log, filtered match views).

**No server, no database, no Docker.** It's a single static web page that
calls the free [OpenDota API](https://docs.opendota.com/) straight from
your browser. OpenDota already parses replays for millions of matches
(yours are very likely already parsed, or can be parsed on demand) and
exposes everything over REST — so there's no replay downloading or parsing
to build or run yourself.

## How it works

```
 your browser ──▶ api.opendota.com ──▶ response cached in localStorage
```

- You enter your Steam account once (Settings page); it's saved in your
  browser's `localStorage`.
- Every page fetches directly from `https://api.opendota.com/api/...`.
- Match details (`/matches/{id}`) never change once parsed, so they're
  cached in `localStorage` forever — you'll never re-spend an API call on
  a match you've already opened. Lists (recent matches, hero stats,
  teammates) refresh every 5 minutes.

Because there's no backend, "running" this just means opening the page —
locally with `npm run dev`, or as an actual deployed website (see
**Deploying** below) you can check from your phone.

## 1. Find your account

You need your **SteamID64** (or a Steam profile URL, or the shorter
`account_id` — the app accepts any of the three). Go to
<https://steamid.io/>, paste your Steam profile URL, and copy the
**steamID64** value.

Also make sure **"Expose Public Match Data"** is on in the Dota 2 client
(Settings → Options → Advanced) — without it, the API can't see your match
history.

## 2. Run it locally

You need [Node.js](https://nodejs.org/) 22+ installed.

```bash
npm install
npm run dev
```

Open the URL it prints (usually <http://localhost:5173>). On first load
it'll send you to **Settings** to enter your account — after that it
remembers you in this browser.

## What you get

- **Matches** — your recent games: hero, K/D/A, GPM/XPM, result, mode.
- **Match detail** — full 10-player scoreboard, item builds, skill build
  order, a gold-advantage and XP-advantage graph over the game, an item
  purchase timeline, kill feed, ward placements, and a searchable **chat
  log**.
- **Trends** — win rate by week over your recent matches, plus a
  hero/result filter over that same match set.
- **Heroes** — your per-hero games/win-rate, plus win rate with/against
  each hero.
- **Teammates** — win rate alongside people you've played with.
- **Chat search** — full-text search across the chat logs of every match
  you've opened in this browser (search widens as you browse more
  matches).
- A **"Show raw OpenDota match data"** toggle on every match page, so
  nothing OpenDota returns is ever hidden even if the dashboard doesn't
  have a dedicated view for it yet.

## If a match shows "hasn't been parsed yet"

OpenDota parses replays either automatically (for tracked/high-MMR
players) or on request. If a recent match of yours shows up with only
basic stats, click **Request parse** on that match page — it asks OpenDota
to fetch and parse the replay from Valve, which takes anywhere from a few
seconds to a couple minutes.

**This only works while Valve still hosts the replay** — roughly 8-14 days
after the match ends. After that window, a match can only ever show deep
stats if someone (you, or OpenDota itself) already requested the parse
while the replay was still available. There's no way to backfill parsing
for an old, never-parsed match — that data is gone for good on Valve's
end.

## Rate limits

The free OpenDota tier is 60 requests/minute and 2,000/day — the caching
described above makes that go a long way for personal use. If you still
hit limits, get a free key at <https://www.opendota.com/api-keys> and paste
it into Settings (or `VITE_OPENDOTA_API_KEY`, see below) for a higher cap.

## Deploying (optional)

If you'd rather have a real URL than running `npm run dev` each time, this
repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that publishes the built site to GitHub Pages on every push to `main`:

1. In the repo's GitHub settings: **Pages → Source → GitHub Actions**.
2. Push to `main`. Your dashboard will be live at
   `https://<you>.github.io/<repo-name>/`.

By default, each visitor (i.e. you, on each device) still enters their
account once via the Settings page — nothing personal is baked into the
deployed build. If you'd rather the deployed site just always show your
stats with zero setup, copy `.env.example` to `.env`, fill in
`VITE_DEFAULT_ACCOUNT_ID`, and either build locally with that `.env` or add
it as a repository secret (`VITE_DEFAULT_ACCOUNT_ID`) so the GitHub Actions
build picks it up.

Note this doesn't add any real privacy: the deployed page is just calling
the same public OpenDota API anyone can call directly — it's exactly as
private (or public) as your data already is on opendota.com.

## Project layout

```
src/
  opendota.ts       OpenDota API client (one function per endpoint)
  cache.ts          localStorage caching (forever for matches, 5min for lists)
  settings.ts       account_id / API key storage + SteamID64 parsing
  dota.ts           hero/item/ability id -> name/icon lookups, formatting helpers
  data/             hero/item/ability name+image data (from odota/dotaconstants)
  pages/            one file per route (Dashboard, MatchDetail, Trends, ...)
  components/       Scoreboard, AdvantageChart (shared across pages)
```

To add your own view: add a `.tsx` file under `src/pages/`, wire it into
`src/App.tsx`'s `<Routes>`, and call the existing functions in
`src/opendota.ts` (add a new one there if you need an endpoint that isn't
covered yet — see <https://docs.opendota.com/> for the full API).
