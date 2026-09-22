export interface MatchPlayerRow {
  match_id: number;
  player_slot: number;
  account_id: number | null;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  level: number;
  net_worth: number | null;
  hero_damage: number | null;
  tower_damage: number | null;
  hero_healing: number | null;
  items: number[];
  backpack: number[];
  item_neutral: number | null;
  leaver_status: number;
}

export interface AccountMatchRow {
  match_id: number;
  start_time: string;
  duration: number;
  radiant_win: boolean;
  parse_status: string;
  player_slot: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  items: number[];
  won: boolean;
}

export interface MatchDetailResponse {
  match: {
    match_id: number;
    start_time: string;
    duration: number;
    radiant_win: boolean;
    game_mode: number;
    lobby_type: number;
    parse_status: string;
    parse_error: string | null;
  };
  players: MatchPlayerRow[];
  deep: {
    playerTimeSeries: Array<{
      player_slot?: number;
      account_id?: number;
      hero_id?: number;
      gold_t: number[];
      xp_t: number[];
      lh_t: number[];
      purchase_log: Array<Record<string, unknown>>;
      kills_log: Array<Record<string, unknown>>;
      buyback_log: Array<Record<string, unknown>>;
      runes_log: Array<Record<string, unknown>>;
      obs_log: Array<Record<string, unknown>>;
      sen_log: Array<Record<string, unknown>>;
    }>;
    advantage: { gold_adv: number[]; xp_adv: number[] };
    kills: Array<Record<string, unknown>>;
  } | null;
  raw: unknown;
}

export interface StatusResponse {
  trackedAccounts: number[];
  pollIntervalSeconds: number;
  steamApiKeyConfigured: boolean;
  accounts: Array<{
    account_id: number;
    persona_name: string | null;
    last_match_id: number | null;
    last_polled_at: string | null;
  }>;
  totalMatches: number;
}
