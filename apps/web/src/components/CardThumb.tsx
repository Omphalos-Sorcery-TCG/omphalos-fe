import { memo } from "react";
import type { CardSummary } from "@omphalos/cards";
import { imageUrl } from "@omphalos/cards";

interface Props {
  card: CardSummary;
  onSelect: (card: CardSummary) => void;
  building?: boolean;
  /** Copies of this card already in the open deck. */
  count?: number;
  /** Whether this card is the open deck's Avatar. */
  isAvatar?: boolean;
}

function CardThumbImpl({
  card,
  onSelect,
  building = false,
  count = 0,
  isAvatar = false,
}: Props) {
  const title = building ? `Add ${card.name}` : card.name;
  return (
    <button
      className={`thumb${building ? " build" : ""}`}
      onClick={() => onSelect(card)}
      title={title}
    >
      <img
        src={imageUrl(card.slug)}
        alt={card.name}
        loading="lazy"
        decoding="async"
        width={380}
        height={531}
      />
      {building && <span className="thumb-add" aria-hidden>+</span>}
      {isAvatar ? (
        <span className="thumb-badge avatar" title="Avatar">★</span>
      ) : (
        count > 0 && <span className="thumb-badge">{count}</span>
      )}
    </button>
  );
}

export const CardThumb = memo(CardThumbImpl);
