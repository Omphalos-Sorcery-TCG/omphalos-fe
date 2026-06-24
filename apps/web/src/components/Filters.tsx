import { useMemo } from "react";
import type { CardSummary } from "@omphalos/cards";
import { useStore } from "../store";
import { ELEMENT_ORDER, setNames, TYPE_ORDER } from "../lib/cards";

interface FacetGroupProps {
  title: string;
  facet: "types" | "elements" | "sets";
  options: string[];
}

function FacetGroup({ title, facet, options }: FacetGroupProps) {
  const active = useStore((s) => s.filters[facet]);
  const toggle = useStore((s) => s.toggleFacet);

  return (
    <div className="facet">
      <h3>{title}</h3>
      <div className="chips">
        {options.map((opt) => (
          <button
            key={opt}
            className={`chip${active.has(opt) ? " on" : ""}`}
            onClick={() => toggle(facet, opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Filters({ cards }: { cards: CardSummary[] }) {
  const clear = useStore((s) => s.clearFilters);
  const sets = useMemo(() => setNames(cards), [cards]);

  return (
    <div className="filters">
      <div className="filters-head">
        <h2>Filters</h2>
        <button className="link" onClick={clear}>
          Clear
        </button>
      </div>
      <FacetGroup title="Type" facet="types" options={[...TYPE_ORDER]} />
      <FacetGroup title="Element" facet="elements" options={[...ELEMENT_ORDER]} />
      <FacetGroup title="Set" facet="sets" options={sets} />
    </div>
  );
}
