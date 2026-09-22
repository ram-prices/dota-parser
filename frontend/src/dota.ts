import heroesData from "./data/heroes.json";
import itemsData from "./data/items.json";

const CDN = "https://cdn.cloudflare.steamstatic.com";

type HeroEntry = { id: number; name: string; img: string; icon: string };
type ItemEntry = { name: string; img: string };

const heroes = heroesData as Record<string, HeroEntry>;
const items = itemsData as Record<string, ItemEntry>;

export function heroName(heroId: number | undefined | null): string {
  if (!heroId) return "Unknown Hero";
  return heroes[String(heroId)]?.name ?? `Hero #${heroId}`;
}

export function heroIcon(heroId: number | undefined | null): string | null {
  if (!heroId) return null;
  const h = heroes[String(heroId)];
  return h ? `${CDN}${h.icon}` : null;
}

export function heroImage(heroId: number | undefined | null): string | null {
  if (!heroId) return null;
  const h = heroes[String(heroId)];
  return h ? `${CDN}${h.img}` : null;
}

export function itemName(itemId: number | undefined | null): string {
  if (!itemId) return "";
  return items[String(itemId)]?.name ?? "";
}

export function itemImage(itemId: number | undefined | null): string | null {
  if (!itemId) return null;
  const it = items[String(itemId)];
  return it?.img ? `${CDN}${it.img}` : null;
}

export function isRadiant(playerSlot: number): boolean {
  return playerSlot < 128;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
