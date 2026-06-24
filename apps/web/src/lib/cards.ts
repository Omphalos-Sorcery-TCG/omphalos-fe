import type { Card, CardSummary } from "@sorcery/types";
import { splitList } from "@sorcery/types";

/** Fetch the lightweight card index (one summary per card) from public/index.json. */
export async function loadIndex(): Promise<CardSummary[]> {
  const res = await fetch("/index.json");
  if (!res.ok) {
    throw new Error(`Failed to load index.json (${res.status})`);
  }
  return (await res.json()) as CardSummary[];
}

// Detail chunks are fetched on demand and cached so repeat opens are free.
const chunkCache = new Map<number, Promise<Card[]>>();

function loadChunk(chunk: number): Promise<Card[]> {
  let pending = chunkCache.get(chunk);
  if (!pending) {
    pending = fetch(`/chunks/cards-${chunk}.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load chunk ${chunk} (${res.status})`);
        }
        return res.json() as Promise<Card[]>;
      })
      .catch((err) => {
        chunkCache.delete(chunk); // don't cache a failed fetch
        throw err;
      });
    chunkCache.set(chunk, pending);
  }
  return pending;
}

/** Fetch the full card for a summary, loading (and caching) its detail chunk. */
export async function loadCardDetail(summary: CardSummary): Promise<Card> {
  const chunk = await loadChunk(summary.chunk);
  const card = chunk.find((c) => c.name === summary.name);
  if (!card) {
    throw new Error(`Card "${summary.name}" missing from chunk ${summary.chunk}`);
  }
  return card;
}

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
