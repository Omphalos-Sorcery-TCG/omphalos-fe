import { create } from "zustand";
import type { Deck, DeckSection } from "@sorcery/types";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth";

/** Row shape for the deck list (without its cards). */
export interface DeckListItem {
  id: string;
  name: string;
  updatedAt: string;
  /** Card name of the deck's Avatar, for an art preview (null if unset). */
  avatar: string | null;
}

type Status = "idle" | "loading" | "ready" | "error";

interface DecksState {
  list: DeckListItem[];
  status: Status;
  error: string | null;

  /** The deck currently open in the builder (null = none). */
  active: Deck | null;
  /** When the open deck was last saved (null for a new, unsaved deck). */
  activeUpdatedAt: string | null;
  dirty: boolean;
  saving: boolean;

  loadList: () => Promise<void>;
  newDeck: () => void;
  openDeck: (id: string) => Promise<void>;
  closeDeck: () => void;
  deleteDeck: (id: string) => Promise<void>;

  setName: (name: string) => void;
  setAvatar: (name: string | null) => void;
  addCard: (name: string, section: DeckSection) => void;
  changeQty: (name: string, section: DeckSection, delta: number) => void;
  removeCard: (name: string, section: DeckSection) => void;
  save: () => Promise<void>;
}

function blankDeck(): Deck {
  return { name: "Untitled deck", avatar: null, cards: [] };
}

export const useDecks = create<DecksState>((set, get) => ({
  list: [],
  status: "idle",
  error: null,
  active: null,
  activeUpdatedAt: null,
  dirty: false,
  saving: false,

  loadList: async () => {
    set({ status: "loading", error: null });
    const { data, error } = await supabase
      .from("decks")
      .select("id, name, updated_at, avatar_card")
      .order("updated_at", { ascending: false });
    if (error) {
      set({ status: "error", error: error.message });
      return;
    }
    set({
      status: "ready",
      list: (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        updatedAt: d.updated_at,
        avatar: d.avatar_card,
      })),
    });
  },

  newDeck: () => set({ active: blankDeck(), activeUpdatedAt: null, dirty: false }),

  openDeck: async (id) => {
    set({ status: "loading", error: null });
    const [{ data: deck, error: e1 }, { data: cards, error: e2 }] =
      await Promise.all([
        supabase
          .from("decks")
          .select("id, name, avatar_card, updated_at")
          .eq("id", id)
          .single(),
        supabase
          .from("deck_cards")
          .select("card_name, section, quantity")
          .eq("deck_id", id),
      ]);
    if (e1 || e2 || !deck) {
      set({ status: "error", error: (e1 ?? e2)?.message ?? "Deck not found" });
      return;
    }
    set({
      status: "ready",
      dirty: false,
      activeUpdatedAt: deck.updated_at,
      active: {
        id: deck.id,
        name: deck.name,
        avatar: deck.avatar_card,
        cards: (cards ?? []).map((c) => ({
          name: c.card_name,
          section: c.section as DeckSection,
          quantity: c.quantity,
        })),
      },
    });
  },

  closeDeck: () => set({ active: null, activeUpdatedAt: null, dirty: false }),

  deleteDeck: async (id) => {
    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (error) {
      set({ error: error.message });
      return;
    }
    const active = get().active;
    set((s) => ({
      list: s.list.filter((d) => d.id !== id),
      active: active?.id === id ? null : active,
    }));
  },

  setName: (name) =>
    set((s) => (s.active ? { active: { ...s.active, name }, dirty: true } : s)),

  setAvatar: (name) =>
    set((s) =>
      s.active ? { active: { ...s.active, avatar: name }, dirty: true } : s,
    ),

  addCard: (name, section) =>
    set((s) => {
      if (!s.active) return s;
      const cards = [...s.active.cards];
      const i = cards.findIndex((c) => c.name === name && c.section === section);
      if (i >= 0) cards[i] = { ...cards[i], quantity: cards[i].quantity + 1 };
      else cards.push({ name, section, quantity: 1 });
      return { active: { ...s.active, cards }, dirty: true };
    }),

  changeQty: (name, section, delta) =>
    set((s) => {
      if (!s.active) return s;
      const cards = s.active.cards
        .map((c) =>
          c.name === name && c.section === section
            ? { ...c, quantity: c.quantity + delta }
            : c,
        )
        .filter((c) => c.quantity > 0);
      return { active: { ...s.active, cards }, dirty: true };
    }),

  removeCard: (name, section) =>
    set((s) =>
      s.active
        ? {
            active: {
              ...s.active,
              cards: s.active.cards.filter(
                (c) => !(c.name === name && c.section === section),
              ),
            },
            dirty: true,
          }
        : s,
    ),

  save: async () => {
    const active = get().active;
    const userId = useAuth.getState().user?.id;
    if (!active || !userId) return;
    set({ saving: true, error: null });
    try {
      // Upsert the deck row (insert when new, update when existing).
      const { data: row, error: e1 } = await supabase
        .from("decks")
        .upsert({
          id: active.id, // undefined → DB generates one
          user_id: userId,
          name: active.name,
          avatar_card: active.avatar,
        })
        .select("id")
        .single();
      if (e1 || !row) throw e1 ?? new Error("Failed to save deck");

      const deckId = row.id as string;

      // Replace the deck's cards wholesale (simple + correct for small decks).
      const { error: e2 } = await supabase
        .from("deck_cards")
        .delete()
        .eq("deck_id", deckId);
      if (e2) throw e2;

      if (active.cards.length) {
        const { error: e3 } = await supabase.from("deck_cards").insert(
          active.cards.map((c) => ({
            deck_id: deckId,
            card_name: c.name,
            section: c.section,
            quantity: c.quantity,
          })),
        );
        if (e3) throw e3;
      }

      set((s) => ({
        saving: false,
        dirty: false,
        activeUpdatedAt: new Date().toISOString(),
        active: s.active ? { ...s.active, id: deckId } : null,
      }));
      await get().loadList();
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
    }
  },
}));
