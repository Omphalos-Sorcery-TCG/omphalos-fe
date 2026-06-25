import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardSummary } from "@omphalos-sorcery-tcg/cards";
import { sectionForType } from "@omphalos-sorcery-tcg/cards";
import { useStore } from "./store";
import { useAuth } from "./auth";
import { useDecks } from "./decks";
import { filterCards } from "./lib/cards";
import { navigate, useLocation } from "./router";
import { Home } from "./components/Home";
import { SearchBar } from "./components/SearchBar";
import { Filters } from "./components/Filters";
import { CardGrid } from "./components/CardGrid";
import { CardDetail } from "./components/CardDetail";
import { Pagination } from "./components/Pagination";
import { AuthBar } from "./components/AuthBar";
import { DeckPanel } from "./components/DeckPanel";

/** How many cards to render per page. */
const PAGE_SIZE = 60;

export function App() {
  const loc = useLocation();
  const path = new URL(loc, window.location.origin).pathname;
  const load = useStore((s) => s.load);
  const initAuth = useAuth((s) => s.init);

  // Load card data + resolve the auth session once, up front, so navigating to
  // the results page is instant.
  useEffect(() => {
    void load();
    initAuth();
  }, [load, initAuth]);

  return path === "/" ? <Home /> : <Browser />;
}

/** The search-results / browse page: top bar, filters, card grid, deck builder. */
function Browser() {
  const { cards, status, error, filters, selected, detailStatus, detailError, select } =
    useStore();
  const setSearch = useStore((s) => s.setSearch);
  const user = useAuth((s) => s.user);
  const activeDeck = useDecks((s) => s.active);
  const addCard = useDecks((s) => s.addCard);
  const setAvatar = useDecks((s) => s.setAvatar);
  const [page, setPage] = useState(1);
  const [decksOpen, setDecksOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  // "Build mode": a deck is open, so clicking a card adds it instead of
  // opening its detail view.
  const building = !!activeDeck;

  // Number of active filter facets, surfaced on the mobile Filters button.
  const activeFilterCount =
    filters.types.size + filters.elements.size + filters.sets.size;

  // Seed the search from the URL's ?q= when the results page first opens.
  useEffect(() => {
    const q = new URL(window.location.href).searchParams.get("q") ?? "";
    if (q) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync with the live search so results stay shareable.
  // Skip the first run so we don't clobber the ?q= we just seeded above.
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    navigate(
      filters.search ? `/search?q=${encodeURIComponent(filters.search)}` : "/search",
      { replace: true },
    );
  }, [filters.search]);

  const quantityByName = useMemo(() => {
    const map = new Map<string, number>();
    if (activeDeck) {
      for (const c of activeDeck.cards)
        map.set(c.name, (map.get(c.name) ?? 0) + c.quantity);
    }
    return map;
  }, [activeDeck]);

  const handleCardClick = useCallback(
    (card: CardSummary) => {
      if (!building) {
        void select(card);
        return;
      }
      const section = sectionForType(card.type);
      if (section === "avatar") setAvatar(card.name);
      else addCard(card.name, section);
    },
    [building, select, setAvatar, addCard],
  );

  const visible = useMemo(
    () => filterCards(cards, filters),
    [cards, filters],
  );

  // Reset to the first page whenever the filtered results change.
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageCards = useMemo(
    () => visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [visible, current],
  );

  const goToPage = (next: number) => {
    setPage(next);
    contentRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className={`app${building ? " building" : ""}`}>
      <header className="topbar">
        <button
          className="icon-btn filters-toggle"
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
        >
          ☰
          {activeFilterCount > 0 && (
            <span className="dot">{activeFilterCount}</span>
          )}
        </button>
        <button
          className="brand brand-link"
          onClick={() => navigate("/")}
          aria-label="Home"
        >
          Omphalos<span className="brand-sub">Sorcery TCG</span>
        </button>
        <SearchBar />
        <div className="count">
          {status === "ready" ? `${visible.length} / ${cards.length}` : ""}
        </div>
        <AuthBar
          decksOpen={decksOpen}
          onToggleDecks={() => setDecksOpen((v) => !v)}
        />
      </header>

      <div className="body">
        <aside className={`sidebar${filtersOpen ? " open" : ""}`}>
          <Filters cards={cards} count={visible.length} />
        </aside>

        <main className="content" ref={contentRef}>
          {building && activeDeck && (
            <div className="build-banner">
              <span className="build-dot" aria-hidden />
              <span>
                Building <strong>{activeDeck.name || "Untitled deck"}</strong> —
                click a card to add it.
              </span>
              {!decksOpen && (
                <button className="link" onClick={() => setDecksOpen(true)}>
                  Show deck ›
                </button>
              )}
            </div>
          )}
          {status === "loading" && <p className="state">Loading cards…</p>}
          {status === "error" && (
            <p className="state error">Failed to load cards: {error}</p>
          )}
          {status === "ready" && visible.length === 0 && (
            <p className="state">No cards match your search.</p>
          )}
          {status === "ready" && visible.length > 0 && (
            <>
              <CardGrid
                cards={pageCards}
                onSelect={handleCardClick}
                building={building}
                quantityByName={quantityByName}
                avatarName={activeDeck?.avatar ?? null}
              />
              <Pagination
                page={current}
                pageCount={pageCount}
                onChange={goToPage}
              />
            </>
          )}
        </main>

        {decksOpen && user && <DeckPanel onClose={() => setDecksOpen(false)} />}

        {(filtersOpen || (decksOpen && user)) && (
          <div
            className="scrim"
            onClick={() => {
              setFiltersOpen(false);
              setDecksOpen(false);
            }}
          />
        )}
      </div>

      {selected && detailStatus === "ready" && (
        <CardDetail card={selected} onClose={() => select(null)} />
      )}
      {(detailStatus === "loading" || detailStatus === "error") && (
        <div className="overlay" onClick={() => select(null)}>
          <div
            className="detail detail-state"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => select(null)}
              aria-label="Close"
            >
              ×
            </button>
            {detailStatus === "loading" && <p className="state">Loading card…</p>}
            {detailStatus === "error" && (
              <p className="state error">Failed to load card: {detailError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
