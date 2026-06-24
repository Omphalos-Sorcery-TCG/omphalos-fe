import { create } from "zustand";
import type { Card, CardSummary } from "@omphalos/cards";
import { emptyFilters, type Filters, loadCardDetail, loadIndex } from "./lib/cards";

type Status = "idle" | "loading" | "ready" | "error";
type DetailStatus = "idle" | "loading" | "ready" | "error";
type FacetKey = "types" | "elements" | "sets";

interface AppState {
  cards: CardSummary[];
  status: Status;
  error: string | null;
  filters: Filters;

  selected: Card | null;
  detailStatus: DetailStatus;
  detailError: string | null;

  load: () => Promise<void>;
  setSearch: (value: string) => void;
  toggleFacet: (facet: FacetKey, value: string) => void;
  clearFilters: () => void;
  select: (summary: CardSummary | null) => Promise<void>;
}

// Bumped on every select() so a slow detail fetch can't clobber a newer one.
let selectToken = 0;

export const useStore = create<AppState>((set, get) => ({
  cards: [],
  status: "idle",
  error: null,
  filters: emptyFilters(),

  selected: null,
  detailStatus: "idle",
  detailError: null,

  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const cards = await loadIndex();
      set({ cards, status: "ready" });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  setSearch: (value) =>
    set((s) => ({ filters: { ...s.filters, search: value } })),

  toggleFacet: (facet, value) =>
    set((s) => {
      const next = new Set(s.filters[facet]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { filters: { ...s.filters, [facet]: next } };
    }),

  clearFilters: () => set({ filters: emptyFilters() }),

  select: async (summary) => {
    if (!summary) {
      selectToken++;
      set({ selected: null, detailStatus: "idle", detailError: null });
      return;
    }
    const token = ++selectToken;
    set({ selected: null, detailStatus: "loading", detailError: null });
    try {
      const card = await loadCardDetail(summary);
      if (token !== selectToken) return; // a newer selection won
      set({ selected: card, detailStatus: "ready" });
    } catch (err) {
      if (token !== selectToken) return;
      set({ detailStatus: "error", detailError: (err as Error).message });
    }
  },
}));
