export interface SteamMatchHistoryEntry {
  match_id: number;
  match_seq_num: number;
  start_time: number;
  lobby_type: number;
  radiant_team_id?: number;
  dire_team_id?: number;
  players: { account_id?: number; player_slot: number; hero_id: number }[];
}

export interface SteamMatchPlayer {
  account_id?: number;
  player_slot: number;
  hero_id: number;
  item_0: number;
  item_1: number;
  item_2: number;
  item_3: number;
  item_4: number;
  item_5: number;
  backpack_0?: number;
  backpack_1?: number;
  backpack_2?: number;
  item_neutral?: number;
  kills: number;
  deaths: number;
  assists: number;
  leaver_status: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  level: number;
  gold?: number;
  gold_spent?: number;
  hero_damage?: number;
  tower_damage?: number;
  hero_healing?: number;
  net_worth?: number;
}

export interface SteamMatchDetails {
  match_id: number;
  duration: number;
  start_time: number;
  radiant_win: boolean;
  game_mode: number;
  lobby_type: number;
  cluster: number;
  replay_salt?: number;
  first_blood_time?: number;
  radiant_score?: number;
  dire_score?: number;
  engine?: number;
  players: SteamMatchPlayer[];
}

export interface ParsedMatchSummary {
  raw: unknown;
  goldAdvantage?: number[];
  xpAdvantage?: number[];
  purchaseLog?: Array<{ time: number; key: string; player_slot?: number }>;
  killLog?: Array<{ time: number; attacker_slot?: number; target_slot?: number }>;
}
