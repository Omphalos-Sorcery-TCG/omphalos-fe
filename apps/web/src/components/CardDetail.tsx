import { useEffect, useMemo, useState } from "react";
import type { Card, StatBlock } from "@omphalos-sorcery-tcg/cards";
import { imageUrl, printings, sectionForType, splitList } from "@omphalos-sorcery-tcg/cards";
import { useDecks } from "../decks";

const ELEMENTS = ["Air", "Earth", "Fire", "Water"] as const;

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function Thresholds({ stats }: { stats: StatBlock }) {
  const active = ELEMENTS.filter((e) => stats.thresholds[e.toLowerCase() as Lowercase<typeof e>] > 0);
  if (active.length === 0) return null;
  return (
    <div className="thresholds">
      {active.map((e) => {
        const n = stats.thresholds[e.toLowerCase() as Lowercase<typeof e>];
        return (
          <span key={e} className={`pip pip-${e.toLowerCase()}`} title={e}>
            {e[0]}
            {n > 1 ? `×${n}` : ""}
          </span>
        );
      })}
    </div>
  );
}

export function CardDetail({ card, onClose }: { card: Card; onClose: () => void }) {
  const prints = useMemo(() => printings(card), [card]);
  const [active, setActive] = useState(0);
  const current = prints[active] ?? prints[0];
  const stats = current.set.metadata;

  const activeDeck = useDecks((s) => s.active);
  const addCard = useDecks((s) => s.addCard);
  const setAvatar = useDecks((s) => s.setAvatar);
  const section = sectionForType(card.guardian.type);

  // Reset selection when the card changes; close on Escape.
  useEffect(() => setActive(0), [card]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const subtypes = splitList(card.subTypes);
  const released = new Date(current.set.releasedAt).getFullYear();

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`detail${card.guardian.type === "Site" ? " site" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="detail-art">
          <img
            src={imageUrl(current.variant.slug)}
            alt={`${card.name} — ${current.set.name} (${current.variant.finish})`}
            width={380}
            height={531}
          />
        </div>

        <div className="detail-info">
          <h1>{card.name}</h1>
          <p className="typeline">
            {stats.type}
            {stats.rarity && stats.rarity !== "None" ? ` · ${stats.rarity}` : ""}
            {card.elements !== "None" ? ` · ${card.elements}` : ""}
          </p>

          {activeDeck && (
            <div className="add-to-deck">
              {section === "avatar" ? (
                <button
                  className="primary-btn small"
                  onClick={() => setAvatar(card.name)}
                >
                  Set as Avatar
                </button>
              ) : (
                <button
                  className="primary-btn small"
                  onClick={() => addCard(card.name, section)}
                >
                  Add to {section === "atlas" ? "Atlas" : "Spellbook"}
                </button>
              )}
            </div>
          )}

          <div className="stats">
            {stats.cost !== null && <StatLine label="Cost" value={stats.cost} />}
            {stats.attack !== null && <StatLine label="Attack" value={stats.attack} />}
            {stats.defence !== null && <StatLine label="Defence" value={stats.defence} />}
            {stats.life !== null && <StatLine label="Life" value={stats.life} />}
          </div>
          <Thresholds stats={stats} />

          {subtypes.length > 0 && (
            <p className="subtypes">{subtypes.join(" · ")}</p>
          )}

          {stats.rulesText && (
            <div className="rules">
              {stats.rulesText.split("\n").map((line, i) =>
                line.trim() ? <p key={i}>{line}</p> : <br key={i} />,
              )}
            </div>
          )}

          {current.variant.flavorText && (
            <p className="flavor">{current.variant.flavorText}</p>
          )}

          <div className="printings">
            <h2>Printings · {prints.length}</h2>
            <ul>
              {prints.map((p, i) => (
                <li key={p.variant.slug}>
                  <button
                    className={`printing${i === active ? " on" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <img
                      src={imageUrl(p.variant.slug)}
                      alt=""
                      loading="lazy"
                      width={48}
                      height={67}
                    />
                    <span className="printing-meta">
                      <strong>{p.set.name}</strong>
                      <span className="muted">
                        {new Date(p.set.releasedAt).getFullYear()} ·{" "}
                        {p.variant.finish}
                      </span>
                      <span className="muted">{p.variant.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="credit muted">
            {current.set.name} {released} · art by {current.variant.artist} ·{" "}
            {current.variant.product.replace(/_/g, " ")}
          </p>
        </div>
      </div>
    </div>
  );
}
