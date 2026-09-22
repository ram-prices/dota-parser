CREATE TABLE IF NOT EXISTS accounts (
  account_id BIGINT PRIMARY KEY,
  persona_name TEXT,
  last_match_id BIGINT,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  match_id BIGINT PRIMARY KEY,
  start_time TIMESTAMPTZ,
  duration INT,
  radiant_win BOOLEAN,
  game_mode INT,
  lobby_type INT,
  cluster INT,
  replay_salt BIGINT,
  replay_url TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending', -- pending | parsing | parsed | no_replay | failed
  parse_error TEXT,
  match_details JSONB,
  parsed_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  player_slot INT NOT NULL,
  account_id BIGINT,
  hero_id INT,
  kills INT,
  deaths INT,
  assists INT,
  last_hits INT,
  denies INT,
  gold_per_min INT,
  xp_per_min INT,
  level INT,
  net_worth INT,
  hero_damage INT,
  tower_damage INT,
  hero_healing INT,
  items INT[],
  backpack INT[],
  item_neutral INT,
  leaver_status INT,
  PRIMARY KEY (match_id, player_slot)
);

CREATE INDEX IF NOT EXISTS idx_match_players_account ON match_players(account_id);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON matches(start_time DESC);
