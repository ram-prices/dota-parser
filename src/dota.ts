import heroesData from "./data/heroes.json";
import heroesByNameData from "./data/heroesByName.json";
import itemsData from "./data/items.json";
import itemsByNameData from "./data/itemsByName.json";
import abilitiesData from "./data/abilities.json";

const CDN = "https://cdn.cloudflare.steamstatic.com";

type HeroEntry = { id: number; name: string; img: string; icon: string };
type ItemEntry = { name: string; img: string };
type ItemByNameEntry = { id: number; name: string; img: string };
type AbilityEntry = { name: string; img: string | null };

const heroesById = heroesData as Record<string, HeroEntry>;
const heroesByName = heroesByNameData as Record<string, HeroEntry>;
const itemsById = itemsData as Record<string, ItemEntry>;
const itemsByName = itemsByNameData as Record<string, ItemByNameEntry>;
const abilitiesById = abilitiesData as Record<string, AbilityEntry>;

export function heroName(heroId: number | undefined | null): string {
  if (!heroId) return "Unknown Hero";
  return heroesById[String(heroId)]?.name ?? `Hero #${heroId}`;
}

export function heroIcon(heroId: number | undefined | null): string | null {
  if (!heroId) return null;
  const h = heroesById[String(heroId)];
  return h ? `${CDN}${h.icon}` : null;
}

// kills_log / a hero's internal unit name (e.g. "npc_dota_hero_axe") -> display name
export function heroNameByUnit(unitName: string | undefined | null): string {
  if (!unitName) return "Unknown";
  return heroesByName[unitName]?.name ?? unitName;
}

export function itemName(itemId: number | undefined | null): string {
  if (!itemId) return "";
  return itemsById[String(itemId)]?.name ?? "";
}

export function itemImage(itemId: number | undefined | null): string | null {
  if (!itemId) return null;
  const it = itemsById[String(itemId)];
  return it?.img ? `${CDN}${it.img}` : null;
}

// purchase_log key is the item's internal shortname (e.g. "blink"), not its numeric id.
export function itemByKey(key: string | undefined | null): { name: string; img: string | null } {
  if (!key) return { name: "Unknown item", img: null };
  const it = itemsByName[key];
  if (!it) return { name: key, img: null };
  return { name: it.name, img: it.img ? `${CDN}${it.img}` : null };
}

export function abilityById(id: number | undefined | null): { name: string; img: string | null } {
  if (!id) return { name: "Stat point", img: null };
  const a = abilitiesById[String(id)];
  if (!a) return { name: `Ability #${id}`, img: null };
  return { name: a.name, img: a.img ? `${CDN}${a.img}` : null };
}

export function isRadiant(playerSlot: number): boolean {
  return playerSlot < 128;
}

// actions is a per-action-type count (clicks/orders); APM is just the total
// rate of those over the game, same definition OpenDota's own site uses.
export function computeApm(actions: Record<string, number> | undefined, durationSeconds: number): number | null {
  if (!actions || durationSeconds <= 0) return null;
  const total = Object.values(actions).reduce((sum, n) => sum + n, 0);
  return Math.round(total / (durationSeconds / 60));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.abs(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatGameTime(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${formatDuration(Math.abs(seconds))}`;
}

export function formatRelativeTime(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const GAME_MODES: Record<number, string> = {
  0: "Unknown",
  1: "All Pick",
  2: "Captains Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  16: "Captains Draft",
  18: "Ability Draft",
  20: "All Random Deathmatch",
  21: "1v1 Mid",
  // Patch 7.00 unified ranked/unranked queueing under this one game_mode -
  // whether a match was ranked is a *separate* field (lobby_type === 7),
  // not part of game_mode. Use matchModeLabel() to get "Ranked" correct.
  22: "All Pick",
  23: "Turbo",
};

export function gameModeName(mode: number | undefined | null): string {
  if (mode == null) return "Unknown";
  return GAME_MODES[mode] ?? `Mode ${mode}`;
}

// lobby_type 7 = Ranked. Combine with game_mode for an accurate label
// (e.g. "Ranked All Pick" vs plain "All Pick") instead of assuming a mode.
export function matchModeLabel(mode: number | undefined | null, lobbyType: number | undefined | null): string {
  const base = gameModeName(mode);
  return lobbyType === 7 ? `Ranked ${base}` : base;
}

const LANE_ROLES: Record<number, string> = {
  1: "Safe Lane",
  2: "Mid Lane",
  3: "Off Lane",
  4: "Jungle",
};

export function laneRoleName(role: number | undefined | null): string {
  if (!role) return "-";
  return LANE_ROLES[role] ?? `Lane ${role}`;
}

// rank_tier is a per-player field: tens digit = medal (1 Herald .. 8
// Immortal), ones digit = star within that medal (1-5; Immortal has no
// stars). This is the reliable "skill level" signal - the match-level
// `skill` estimate OpenDota also exposes is only computed for a subset of
// matches and is frequently null.
const MEDALS: Record<number, string> = {
  1: "Herald",
  2: "Guardian",
  3: "Crusader",
  4: "Archon",
  5: "Legend",
  6: "Ancient",
  7: "Divine",
  8: "Immortal",
};

export function rankTierLabel(tier: number | undefined | null): string {
  if (!tier) return "Unranked";
  const medal = Math.floor(tier / 10);
  const star = tier % 10;
  const name = MEDALS[medal];
  if (!name) return "Unranked";
  if (medal === 8) return "Immortal";
  return star > 0 ? `${name} ${star}` : name;
}

// Average rank across a team/match, for an at-a-glance "skill level of
// this game" summary, e.g. "Ancient 5" or "Divine 2" - not just the medal.
// Can't just average the raw tier numbers: medal/star isn't a continuous
// scale (Ancient 5 is 65, the next real rank is Divine 1 at 71 - there's
// no 66-70), so naive averaging can land on a star that doesn't exist.
// Instead each rank becomes a continuous 0-based score (medal 0-7, star
// 0-4), gets averaged on that scale, then decoded back.
export function averageRankLabel(tiers: Array<number | null | undefined>): string | null {
  const scores = tiers
    .filter((t): t is number => Boolean(t))
    .filter((t) => Math.floor(t / 10) >= 1 && Math.floor(t / 10) <= 8)
    .map((t) => {
      const medal0 = Math.floor(t / 10) - 1;
      const star0 = medal0 === 7 ? 0 : Math.max(0, (t % 10) - 1); // Immortal has no stars
      return medal0 * 5 + star0;
    });
  if (scores.length === 0) return null;

  const avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  const medal = Math.floor(avgScore / 5) + 1;
  const star = (avgScore % 5) + 1;
  return rankTierLabel(medal * 10 + star);
}

const OBJECTIVE_LABELS: Record<string, string> = {
  CHAT_MESSAGE_TOWER_KILL: "Tower destroyed",
  CHAT_MESSAGE_TOWER_DENY: "Tower deny",
  CHAT_MESSAGE_BARRACKS_KILL: "Barracks destroyed",
  CHAT_MESSAGE_ROSHAN_KILL: "Roshan killed",
  CHAT_MESSAGE_AEGIS: "Aegis picked up",
  CHAT_MESSAGE_AEGIS_STOLEN: "Aegis stolen",
  CHAT_MESSAGE_FIRSTBLOOD: "First blood",
  building_kill: "Building destroyed",
};

export function objectiveLabel(type: string | undefined | null): string {
  if (!type) return "Unknown event";
  return OBJECTIVE_LABELS[type] ?? type.replace(/^CHAT_MESSAGE_/, "").replace(/_/g, " ").toLowerCase();
}
