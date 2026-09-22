# Dota Parser

A self-hosted, Dotabuff-style Dota 2 match tracker. Point it at your (or your
friends') Steam account(s) and it will:

1. Poll Valve's official Steam Web API every few minutes for new matches.
2. When a new match shows up, download the replay from Valve's CDN.
3. Parse the replay for in-depth stats (gold/XP graphs, item purchase
   timing, kills, wards, etc.) using [odota/parser](https://github.com/odota/parser),
   the same open-source parsing engine that powers OpenDota's match pages.
4. Store everything in Postgres and show it in a web dashboard.

**This has to run somewhere that's on all the time** (your PC while you play,
a home server, a small VPS, a Raspberry Pi, etc.) — it can't watch for new
matches if it isn't running. It does not need to run on the same machine as
your Dota client; it only needs internet access to reach Steam's API and
Valve's replay CDN.

## How the pieces fit together

```
 Steam Web API  ──▶  backend (poller)  ──▶  odota/parser  ──▶  Postgres  ──▶  frontend
(match history)      (Node/Express)        (parses .dem)     (storage)      (React)
```

- `backend/` — Node/TypeScript service. Every `POLL_INTERVAL_SECONDS` it
  checks each tracked account's recent match history, and for any match it
  hasn't seen yet: fetches full match details from Steam, builds the replay
  download URL, asks the parser service to fetch + parse it, and saves the
  result.
- `parser/` — not custom code, just the official `odota/parser` Docker
  image. It downloads the `.dem.bz2` replay itself and streams back parsed
  JSON (per-player gold/XP over time, purchases, kills, wards, etc.).
- `frontend/` — a small dashboard: match list per tracked account, and a
  match detail page with a full scoreboard, item builds, and gold/XP
  advantage graphs.

## 1. Get a Steam Web API key

Go to <https://steamcommunity.com/dev/apikey>, sign in, and register a key
(you can put anything for the domain, e.g. `localhost`). Keep this key
private — treat it like a password.

## 2. Find your SteamID64

Go to <https://steamid.io/>, paste your Steam profile URL, and copy the
**steamID64** value (a long number starting with `7656119...`). You can list
more than one account (e.g. to track a friend group) — separate them with
commas.

Also make sure **"Expose Public Match Data"** is turned on in the Dota 2
client (Settings → Options → Advanced), otherwise Steam won't return your
match history to the API.

## 3. Configure

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
STEAM_API_KEY=your_key_here
STEAM_ACCOUNT_IDS=76561198012345678
```

## 4. Run it

You need [Docker](https://docs.docker.com/get-docker/) installed. Then:

```bash
docker compose up -d --build
```

This starts four containers: Postgres, the replay parser, the backend
poller/API, and the frontend. First boot takes a minute or two while images
build.

Open **http://localhost:3000** for the dashboard.

To watch the logs (useful for seeing polling/parsing activity):

```bash
docker compose logs -f backend
```

To stop everything: `docker compose down` (add `-v` to also wipe the
database).

## What you'll see

- **Dashboard**: your recent matches — win/loss, hero, KDA, last hits/denies,
  GPM/XPM, final items, and how long ago each match was.
- **Match page**: a full 10-player scoreboard split by team, item builds,
  and (once the replay is parsed) a gold-advantage and XP-advantage graph
  over the course of the game.
- Each match shows a small badge: `pending` → `parsing` → `parsed`, or
  `no_replay` / `failed` if Valve's replay wasn't available or parsing hit
  an error. Basic scoreboard stats (from Steam directly) still show up even
  when the deep parse fails — only the graphs/timelines need the replay
  parse to succeed.
- A **"Show raw parser data"** button on the match page, in case you want to
  see everything the parser extracted, including fields the dashboard
  doesn't have a dedicated visualization for yet.

## Known limitations (read this before you assume something is broken)

- **Replay availability**: Valve only keeps replays on their CDN for a
  limited time after a match ends (longer if you have Dota Plus). If the
  poller doesn't run for a while, you may miss the replay window for some
  matches — you'll still get basic Steam stats, just not the deep graphs.
- **Polling, not push notifications**: Valve doesn't offer a "match just
  finished" webhook, so this checks periodically (`POLL_INTERVAL_SECONDS`,
  default 300s). Lower it if you want matches to show up faster; Valve's API
  has its own rate limits, so don't set it extremely low.
- **Parser output can evolve**: `odota/parser`'s exact field names have
  shifted slightly across Dota patches historically. The backend stores the
  full raw parser output no matter what, and the dashboard is built to
  degrade gracefully (basic stats always work; graphs/timelines only need
  small tweaks in `backend/src/matchView.ts` if a field name ever changes).
- Turbo/custom/co-op bot matches may not have a `replay_salt` at all — those
  are marked `no_replay` and only show basic Steam stats.

## Local development (without Docker)

You'll need Node.js 22+, a local Postgres, and a running `odota/parser`
container (`docker run -p 5600:5600 odota/parser`).

```bash
# backend
cd backend
npm install
DATABASE_URL=postgres://dota:dota@localhost:5432/dota_parser \
PARSER_URL=http://localhost:5600 \
npm run dev

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` to `http://localhost:8080` (see
`frontend/vite.config.ts`).
