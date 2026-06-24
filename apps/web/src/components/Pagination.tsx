interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination">
      <button
        className="page-btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹ Prev
      </button>
      <span className="page-status">
        Page {page} of {pageCount}
      </span>
      <button
        className="page-btn"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next ›
      </button>
    </nav>
  );
}
