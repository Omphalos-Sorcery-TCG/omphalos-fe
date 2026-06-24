import type { CardSummary } from "@omphalos/cards";
import { CardThumb } from "./CardThumb";

interface Props {
  cards: CardSummary[];
  onSelect: (card: CardSummary) => void;
  /** When true, clicking a card adds it to the open deck (build mode). */
  building?: boolean;
  /** Copies of each card currently in the open deck, keyed by name. */
  quantityByName?: Map<string, number>;
  /** Name of the open deck's Avatar, if any. */
  avatarName?: string | null;
}

export function CardGrid({
  cards,
  onSelect,
  building = false,
  quantityByName,
  avatarName = null,
}: Props) {
  return (
    <div className="grid">
      {cards.map((card) => (
        <CardThumb
          key={card.name}
          card={card}
          onSelect={onSelect}
          building={building}
          count={quantityByName?.get(card.name) ?? 0}
          isAvatar={avatarName === card.name}
        />
      ))}
    </div>
  );
}
