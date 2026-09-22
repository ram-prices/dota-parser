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
  22: "Ranked All Pick",
  23: "Turbo",
};

export function gameModeName(mode: number | undefined | null): string {
  if (mode == null) return "Unknown";
  return GAME_MODES[mode] ?? `Mode ${mode}`;
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
