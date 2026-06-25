import type { CardSummary } from "@omphalos-sorcery-tcg/cards";
import { createCardClient, splitList } from "@omphalos-sorcery-tcg/cards";

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

/**
 * A parsed advanced-search query. Free-text terms match the card name (every
 * term must appear — AND); field qualifiers match their field and OR within a
 * field, AND across fields.
 */
export interface ParsedQuery {
  names: string[];
  types: string[];
  sets: string[];
  elements: string[];
  rarities: string[];
}

type QueryField = Exclude<keyof ParsedQuery, "names">;

// Qualifier keywords (with short aliases) → which bucket they fill.
const FIELD_ALIASES: Record<string, QueryField> = {
  type: "types",
  t: "types",
  set: "sets",
  s: "sets",
  element: "elements",
  e: "elements",
  el: "elements",
  rarity: "rarities",
  r: "rarities",
};

/**
 * Parse a search string into structured constraints. Supports `field:value`
 * (a space after the colon is allowed, e.g. "type: site"), quoted values
 * (`set:"flux"`), and bare/quoted free-text name terms. Unknown fields fall
 * back to a name term so nothing is silently dropped.
 */
export function parseQuery(input: string): ParsedQuery {
  const q: ParsedQuery = {
    names: [],
    types: [],
    sets: [],
    elements: [],
    rarities: [],
  };
  // Collapse "field: value" → "field:value" so the value isn't read as a name.
  const normalized = input.replace(/([a-z]+):\s+/gi, "$1:");
  const token = /(\w+):(?:"([^"]*)"|(\S*))|"([^"]*)"|(\S+)/g;

  for (let m = token.exec(normalized); m; m = token.exec(normalized)) {
    const [, field, quotedVal, bareVal, quotedTerm, bareTerm] = m;
    if (field) {
      const value = (quotedVal ?? bareVal ?? "").trim().toLowerCase();
      if (!value) continue;
      const bucket = FIELD_ALIASES[field.toLowerCase()];
      if (bucket) q[bucket].push(value);
      else q.names.push(value);
    } else {
      const term = (quotedTerm ?? bareTerm ?? "").trim().toLowerCase();
      if (term) q.names.push(term);
    }
  }
  return q;
}

/** Apply the sidebar chip facets and the parsed search query to the card list. */
export function filterCards(cards: CardSummary[], f: Filters): CardSummary[] {
  const pq = parseQuery(f.search);
  return cards.filter((card) => {
    // Sidebar chip facets.
    if (f.types.size && !f.types.has(card.type)) return false;
    if (f.sets.size && !card.sets.some((s) => f.sets.has(s.name))) return false;
    if (f.elements.size) {
      const els = splitList(card.elements);
      if (!els.some((e) => f.elements.has(e))) return false;
    }

    // Free-text name terms — every term must appear in the name.
    if (pq.names.length) {
      const name = card.name.toLowerCase();
      if (!pq.names.every((t) => name.includes(t))) return false;
    }
    // type: — prefix-friendly so "type:min" matches Minion.
    if (pq.types.length) {
      const ct = card.type.toLowerCase();
      if (!pq.types.some((v) => ct === v || ct.startsWith(v))) return false;
    }
    // set: — match any set the card appears in.
    if (pq.sets.length) {
      const setNamesLc = card.sets.map((s) => s.name.toLowerCase());
      if (!pq.sets.some((v) => setNamesLc.some((n) => n.includes(v)))) return false;
    }
    // element: — match any of the card's elements.
    if (pq.elements.length) {
      const els = splitList(card.elements).map((e) => e.toLowerCase());
      if (!pq.elements.some((v) => els.some((e) => e.includes(v)))) return false;
    }
    // rarity: — prefix-friendly.
    if (pq.rarities.length) {
      const r = (card.rarity ?? "").toLowerCase();
      if (!pq.rarities.some((v) => r === v || r.startsWith(v))) return false;
    }

    return true;
  });
}
