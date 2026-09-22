import heroesData from "./data/heroes.json";
import heroesByNameData from "./data/heroesByName.json";
import itemsData from "./data/items.json";
import itemsByNameData from "./data/itemsByName.json";
import abilitiesData from "./data/abilities.json";
import type { MatchDetail, MatchPlayer, ObjectiveEntry } from "./types";

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

// position_est (1-5) is OpenDota's estimate of standard Dota "position"
// (farm priority), which is what most players actually mean by "role" -
// distinct from lane_role (just which lane: safe/mid/off/jungle).
const POSITIONS: Record<number, string> = {
  1: "Carry",
  2: "Mid",
  3: "Offlane",
  4: "Soft Support",
  5: "Hard Support",
};

export function positionShort(pos: number | undefined | null): string | null {
  if (!pos || !POSITIONS[pos]) return null;
  return `P${pos}`;
}

export function positionLabel(pos: number | undefined | null): string | null {
  if (!pos || !POSITIONS[pos]) return null;
  return `Position ${pos} - ${POSITIONS[pos]}`;
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

// Each medal's most distinctive color from its actual badge art (the small
// gem/leaf accent, not the overall gray/gold metal), for coloring rank text
// the way the in-game rank medal picker does.
const MEDAL_COLORS: Record<number, string> = {
  1: "#8BC34A", // Herald - light green
  2: "#A0785A", // Guardian - brown
  3: "#26C6DA", // Crusader - cyan
  4: "#3F9142", // Archon - green
  5: "#D32F2F", // Legend - red
  6: "#8C9EFF", // Ancient - light blue with a violet tinge
  7: "#E5C158", // Divine - gold
  8: "#E0672E", // Immortal - red-gold
};

export function rankTierColor(tier: number | undefined | null): string | null {
  if (!tier) return null;
  const medal = Math.floor(tier / 10);
  return MEDAL_COLORS[medal] ?? null;
}

// Average rank across a team/match, as a raw tier number (medal*10+star) -
// see averageRankLabel below for why this can't just average the raw tier
// numbers directly. Exposed separately (not just as the formatted label) so
// callers can also look up its color via rankTierColor().
export function averageRankTier(tiers: Array<number | null | undefined>): number | null {
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
  return medal * 10 + star;
}

// Average rank across a team/match, for an at-a-glance "skill level of
// this game" summary, e.g. "Ancient 5" or "Divine 2" - not just the medal.
// Can't just average the raw tier numbers: medal/star isn't a continuous
// scale (Ancient 5 is 65, the next real rank is Divine 1 at 71 - there's
// no 66-70), so naive averaging can land on a star that doesn't exist.
// Instead each rank becomes a continuous 0-based score (medal 0-7, star
// 0-4), gets averaged on that scale, then decoded back.
export function averageRankLabel(tiers: Array<number | null | undefined>): string | null {
  const tier = averageRankTier(tiers);
  return tier == null ? null : rankTierLabel(tier);
}

// Lane outcome - OpenDota has no direct "did you win your lane" field, only
// each player's lane_efficiency (a farm-vs-optimal-farm ratio, not a
// win/loss). Derived instead from each player's actual lane group (by
// lane_role, not assumed position) vs. the mirrored enemy group's combined
// net worth + XP at the 10 minute mark, with an early lane tower counted as
// a decisive, more concrete signal than a close gold/XP lead.
export type LaneOutcome = "won" | "draw" | "lost";

export const LANE_CUTOFF_MINUTE = 10;
const LANE_WIN_MARGIN = 0.15; // >15% combined net worth + XP lead to call it decisively

// Radiant's safe lane is the bottom lane, Dire's safe lane is the top lane
// (they mirror across the map) - mid is mid for both sides.
function physicalLane(radiant: boolean, laneRole: number): "top" | "mid" | "bot" | null {
  if (laneRole === 2) return "mid";
  if (laneRole === 1) return radiant ? "bot" : "top";
  if (laneRole === 3) return radiant ? "top" : "bot";
  return null;
}

// A lane_role's actual opponent: Radiant Safe (1) faces Dire Off (3) since
// they share the bottom lane, and vice versa; Mid (2) faces Mid.
const MIRROR_LANE_ROLE: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

// Value of a per-minute cumulative array (gold_t, xp_t, lh_t, ...) at a given
// minute, clamped to the last entry if the game ended before then.
export function valueAtMinute(arr: number[] | undefined, minute: number): number | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.min(minute, arr.length - 1)] ?? null;
}

function laneValueAt(player: MatchPlayer, minute: number): number {
  return (valueAtMinute(player.networth_t, minute) ?? 0) + (valueAtMinute(player.xp_t, minute) ?? 0);
}

// Earliest tower in this physical lane destroyed before the cutoff, if any -
// whoever DIDN'T own that tower pushed it down, so they're the beneficiary.
function earlyLaneTowerBeneficiary(
  objectives: ObjectiveEntry[] | undefined,
  lane: "top" | "mid" | "bot",
): "radiant" | "dire" | null {
  if (!objectives) return null;
  const cutoffSeconds = LANE_CUTOFF_MINUTE * 60;
  let earliest: { time: number; ownerTeam: "radiant" | "dire" } | null = null;
  for (const o of objectives) {
    if (o.type !== "building_kill" || !o.key || o.time > cutoffSeconds) continue;
    if (!o.key.includes("tower") || !o.key.endsWith(`_${lane}`)) continue;
    const ownerTeam = o.key.includes("goodguys") ? "radiant" : o.key.includes("badguys") ? "dire" : null;
    if (!ownerTeam) continue;
    if (!earliest || o.time < earliest.time) earliest = { time: o.time, ownerTeam };
  }
  if (!earliest) return null;
  return earliest.ownerTeam === "radiant" ? "dire" : "radiant";
}

// Outcome from the RADIANT side's perspective: "won" = radiant took this
// lane, "lost" = dire took it. Shared by laneOutcome() (one player's own
// result) and laneMatchups() (the full head-to-head for a lane).
function laneResultForGroups(
  radiantGroup: MatchPlayer[],
  direGroup: MatchPlayer[],
  lane: "top" | "mid" | "bot",
  objectives: ObjectiveEntry[] | undefined,
): LaneOutcome | null {
  if (radiantGroup.length === 0 || direGroup.length === 0) return null;

  const radiantScore = radiantGroup.reduce((sum, p) => sum + laneValueAt(p, LANE_CUTOFF_MINUTE), 0);
  const direScore = direGroup.reduce((sum, p) => sum + laneValueAt(p, LANE_CUTOFF_MINUTE), 0);

  let result: LaneOutcome;
  if (radiantScore > direScore * (1 + LANE_WIN_MARGIN)) result = "won";
  else if (direScore > radiantScore * (1 + LANE_WIN_MARGIN)) result = "lost";
  else result = "draw";

  if (result === "draw") {
    const beneficiary = earlyLaneTowerBeneficiary(objectives, lane);
    if (beneficiary) result = beneficiary === "radiant" ? "won" : "lost";
  }

  return result;
}

export function laneOutcome(detail: MatchDetail, playerSlot: number): LaneOutcome | null {
  const me = detail.players.find((p) => p.player_slot === playerSlot);
  if (!me || !me.lane_role) return null;

  const myRadiant = isRadiant(playerSlot);
  const lane = physicalLane(myRadiant, me.lane_role);
  const enemyLaneRole = MIRROR_LANE_ROLE[me.lane_role];
  if (!lane || !enemyLaneRole) return null;

  const myGroup = detail.players.filter((p) => isRadiant(p.player_slot) === myRadiant && p.lane_role === me.lane_role);
  const enemyGroup = detail.players.filter((p) => isRadiant(p.player_slot) !== myRadiant && p.lane_role === enemyLaneRole);

  const radiantGroup = myRadiant ? myGroup : enemyGroup;
  const direGroup = myRadiant ? enemyGroup : myGroup;
  const radiantResult = laneResultForGroups(radiantGroup, direGroup, lane, detail.objectives);
  if (!radiantResult) return null;
  if (radiantResult === "draw") return "draw";

  const myTeamWon = myRadiant ? radiantResult === "won" : radiantResult === "lost";
  return myTeamWon ? "won" : "lost";
}

export function laneOutcomeLabel(outcome: LaneOutcome | null | undefined): string | null {
  if (outcome === "won") return "Won lane";
  if (outcome === "lost") return "Lost lane";
  if (outcome === "draw") return "Even lane";
  return null;
}

export interface LaneMatchup {
  lane: "top" | "mid" | "bot";
  label: string;
  radiantPlayers: MatchPlayer[];
  direPlayers: MatchPlayer[];
  // Radiant-side perspective: "won" = radiant took this lane.
  outcome: LaneOutcome | null;
}

const LANE_LABELS: Record<"top" | "mid" | "bot", string> = {
  top: "Top Lane",
  mid: "Mid Lane",
  bot: "Bottom Lane",
};

// The full head-to-head for all three lanes, for a dedicated match-up view -
// grouped the same way as laneOutcome() (by actual lane_role, not assumed
// position), so it agrees with the per-match W/L badge shown elsewhere.
export function laneMatchups(detail: MatchDetail): LaneMatchup[] {
  return (["top", "mid", "bot"] as const).map((lane) => {
    const radiantPlayers = detail.players.filter(
      (p) => isRadiant(p.player_slot) && p.lane_role != null && physicalLane(true, p.lane_role) === lane,
    );
    const direPlayers = detail.players.filter(
      (p) => !isRadiant(p.player_slot) && p.lane_role != null && physicalLane(false, p.lane_role) === lane,
    );
    const outcome = laneResultForGroups(radiantPlayers, direPlayers, lane, detail.objectives);
    return { lane, label: LANE_LABELS[lane], radiantPlayers, direPlayers, outcome };
  });
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
