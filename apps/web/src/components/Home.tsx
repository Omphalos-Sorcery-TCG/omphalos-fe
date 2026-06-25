import { useState, type FormEvent } from "react";
import { navigate } from "../router";

/** Landing page: title, subheader, and a search box that opens the results page. */
export function Home() {
  const [q, setQ] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  return (
    <div className="home">
      <div className="home-inner">
        <h1 className="home-title">Omphalos</h1>
        <p className="home-sub">
          A Sorcery: Contested Realms TCG Card Database
        </p>
        <form className="home-search" onSubmit={submit} role="search">
          <input
            className="search home-search-input"
            type="search"
            placeholder="Search — name, type:site, set:alpha…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-label="Search cards"
          />
          <button className="primary-btn" type="submit">
            Search
          </button>
        </form>
        <p className="home-hint muted small">
          Try <code>type:site</code>, <code>set:alpha</code>,{" "}
          <code>element:fire</code>, or just a card name. Empty searches every
          card.
        </p>
      </div>
    </div>
  );
}
