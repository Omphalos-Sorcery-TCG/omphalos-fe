import type { CardSummary } from "@omphalos/cards";
import { createCardClient, splitList } from "@omphalos/cards";

// Data is served same-origin from /public (index.json, chunks/) unless
// VITE_CARDS_BASE_URL points at another origin (e.g. a CDN).
const client = createCardClient({
  baseUrl: import.meta.env.VITE_CARDS_BASE_URL ?? "",
});

/** Fetch the lightweight card index (one summary per card). */
export const loadIndex = client.loadIndex;
/** Fetch the full card for a summary, loading (and caching) its detail chunk. */
export const loadCardDetail = client.loadCardDetail;

/** The single elements present across all cards (split from multi-element strings). */
export const ELEMENT_ORDER = ["Air", "Earth", "Fire", "Water"] as const;

/** Card types in the order we want them shown in filters. */
export const TYPE_ORDER = [
  "Avatar",
  "Site",
  "Minion",
  "Magic",
  "Artifact",
  "Aura",
] as const;

/** Distinct set names across all cards, sorted by earliest release date. */
export function setNames(cards: CardSummary[]): string[] {
  const earliest = new Map<string, number>();
  for (const card of cards) {
    for (const s of card.sets) {
      const t = Date.parse(s.releasedAt);
      const cur = earliest.get(s.name);
      if (cur === undefined || t < cur) earliest.set(s.name, t);
    }
  }
  return [...earliest.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
}

export interface Filters {
  search: string;
  types: Set<string>;
  elements: Set<string>;
  sets: Set<string>;
}

export function emptyFilters(): Filters {
  return { search: "", types: new Set(), elements: new Set(), sets: new Set() };
}

/** Apply the active filters to the full card list. */
export function filterCards(cards: CardSummary[], f: Filters): CardSummary[] {
  const q = f.search.trim().toLowerCase();
  return cards.filter((card) => {
    if (q && !card.name.toLowerCase().includes(q)) return false;
    if (f.types.size && !f.types.has(card.type)) return false;
    if (f.sets.size && !card.sets.some((s) => f.sets.has(s.name))) return false;
    if (f.elements.size) {
      const els = splitList(card.elements);
      if (!els.some((e) => f.elements.has(e))) return false;
    }
    return true;
  });
}
