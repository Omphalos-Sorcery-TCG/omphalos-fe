import { useEffect, useMemo } from "react";
import type { CardMeta, DeckSection } from "@omphalos-sorcery-tcg/cards";
import { imageUrl, MIN_ATLAS, MIN_SPELLBOOK, validateDeck } from "@omphalos-sorcery-tcg/cards";
import { useStore } from "../store";
import { useDecks } from "../decks";

function SectionList({
  title,
  section,
  count,
  min,
}: {
  title: string;
  section: DeckSection;
  count: number;
  min: number;
}) {
  const active = useDecks((s) => s.active);
  const changeQty = useDecks((s) => s.changeQty);
  const removeCard = useDecks((s) => s.removeCard);
  const rows = active?.cards.filter((c) => c.section === section) ?? [];
  const pct = Math.min(100, min ? (count / min) * 100 : 0);
  const done = count >= min;

  return (
    <div className="deck-section">
      <h4>
        {title}{" "}
        <span className={done ? "ok" : "warn"}>
          {count}/{min}
        </span>
      </h4>
      <div className={`progress${done ? " done" : ""}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {rows.length === 0 ? (
        <p className="muted small">
          Empty — click cards in the grid to add them here.
        </p>
      ) : (
        <ul className="deck-rows">
          {rows.map((c) => (
            <li key={c.name} className="deck-row">
              <span className="qty">{c.quantity}×</span>
              <span className="deck-card-name" title={c.name}>
                {c.name}
              </span>
              <button
                className="qbtn"
                onClick={() => changeQty(c.name, section, -1)}
                aria-label="One fewer"
              >
                −
              </button>
              <button
                className="qbtn"
                onClick={() => changeQty(c.name, section, 1)}
                aria-label="One more"
              >
                +
              </button>
              <button
                className="qbtn remove"
                onClick={() => removeCard(c.name, section)}
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeckPanel({ onClose }: { onClose: () => void }) {
  const cards = useStore((s) => s.cards);
  const {
    list,
    status,
    error,
    active,
    activeUpdatedAt,
    dirty,
    saving,
    loadList,
    newDeck,
    openDeck,
    closeDeck,
    deleteDeck,
    setName,
    setAvatar,
    save,
  } = useDecks();

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const lookup = useMemo(() => {
    const map = new Map<string, CardMeta>();
    for (const c of cards) map.set(c.name, { type: c.type, rarity: c.rarity });
    return (name: string) => map.get(name);
  }, [cards]);

  const slugByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) map.set(c.name, c.slug);
    return map;
  }, [cards]);

  const validation = useMemo(
    () => (active ? validateDeck(active, lookup) : null),
    [active, lookup],
  );

  return (
    <aside className="deckpanel">
      <div className="deckpanel-head">
        <h2>{active ? "Deck builder" : "My Decks"}</h2>
        <button className="close-inline" onClick={onClose} aria-label="Hide">
          ›
        </button>
      </div>

      <div className="deckpanel-body">
        {error && <p className="form-error">{error}</p>}

        {!active && (
          <>
            <button className="primary-btn" onClick={newDeck}>
              + New deck
            </button>
            {status === "loading" && <p className="muted small">Loading…</p>}
            {status === "ready" && list.length === 0 && (
              <p className="muted small">No decks yet. Create one to start.</p>
            )}
            <ul className="deck-list">
              {list.map((d) => {
                const slug = d.avatar ? slugByName.get(d.avatar) : undefined;
                return (
                  <li key={d.id} className="deck-list-item">
                    <button
                      className="deck-open"
                      onClick={() => void openDeck(d.id)}
                    >
                      <span className="deck-thumb">
                        {slug ? (
                          <img
                            src={imageUrl(slug)}
                            alt={d.avatar ?? ""}
                            loading="lazy"
                          />
                        ) : (
                          <span className="deck-thumb-empty" aria-hidden>
                            ?
                          </span>
                        )}
                      </span>
                      <span className="deck-open-meta">
                        <strong>{d.name}</strong>
                        <span className="muted small">
                          {d.avatar ?? "No avatar"}
                        </span>
                      </span>
                    </button>
                    <button
                      className="qbtn remove"
                      onClick={() => void deleteDeck(d.id)}
                      aria-label="Delete deck"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {active && validation && (
          <div className="deck-editor">
            <div className="deck-editor-top">
              <button className="link" onClick={closeDeck}>
                ‹ Back to list
              </button>
              <span className="muted small">
                {activeUpdatedAt
                  ? `Updated ${new Date(activeUpdatedAt).toLocaleDateString()}`
                  : "Not saved yet"}
              </span>
            </div>

            <span
              className={`deck-pill ${validation.valid ? "valid" : "invalid"}`}
            >
              {validation.valid
                ? "✓ Legal deck"
                : `${validation.problems.length} issue${
                    validation.problems.length === 1 ? "" : "s"
                  } to fix`}
            </span>

            <label className="field">
              <span>Deck name</span>
              <input
                value={active.name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="deck-avatar">
              <span className="field-label">Avatar</span>
              {active.avatar ? (
                <div className="avatar-pick">
                  {slugByName.get(active.avatar) && (
                    <img
                      className="avatar-art"
                      src={imageUrl(slugByName.get(active.avatar)!)}
                      alt={active.avatar}
                    />
                  )}
                  <span className="avatar-name">{active.avatar}</span>
                  <button
                    className="qbtn remove"
                    onClick={() => setAvatar(null)}
                    aria-label="Clear avatar"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="muted small">
                  Open an Avatar card and choose “Set as Avatar”.
                </span>
              )}
            </div>

            {!validation.valid && (
              <div className="deck-status invalid">
                <ul>
                  {validation.problems.map((p, i) => (
                    <li key={i}>{p.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <SectionList
              title="Spellbook"
              section="spellbook"
              count={validation.spellbookCount}
              min={MIN_SPELLBOOK}
            />
            <SectionList
              title="Atlas"
              section="atlas"
              count={validation.atlasCount}
              min={MIN_ATLAS}
            />
          </div>
        )}
      </div>

      {active && (
        <div className="deck-footer">
          <button
            className="primary-btn"
            onClick={() => void save()}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : dirty ? "Save deck" : "Saved"}
          </button>
        </div>
      )}
    </aside>
  );
}
