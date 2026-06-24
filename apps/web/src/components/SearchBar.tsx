import { useStore } from "../store";

export function SearchBar() {
  const search = useStore((s) => s.filters.search);
  const setSearch = useStore((s) => s.setSearch);

  return (
    <input
      className="search"
      type="search"
      placeholder="Search cards by name…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      autoComplete="off"
      spellCheck={false}
    />
  );
}
