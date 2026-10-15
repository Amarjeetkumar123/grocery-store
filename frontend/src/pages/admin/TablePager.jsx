import { Icon } from '../../Icon.jsx';

const pageSizes = [10, 25, 50];

// Page numbers around the current page, at most five.
function nearbyPages(page, pageCount) {
  const first = Math.max(1, Math.min(page - 2, pageCount - 4));
  return Array.from({ length: Math.min(5, pageCount) }, (unused, index) => first + index);
}

// Under a long admin table: "Showing 1–25 of 80", rows per page, page numbers.
// onChange({ page }) or onChange({ pageSize, page: 1 }).
export function TablePager({ page, pageCount, pageSize, total, shownCount, onChange }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="table-pager">
      <span>Showing <strong>{first}–{first + shownCount - 1}</strong> of <strong>{total}</strong></span>
      <div className="table-pager-controls">
        <label className="table-pager-size">Rows per page
          <select className="input input-small" value={pageSize} onChange={(event) => onChange({ pageSize: Number(event.target.value), page: 1 })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <nav className="table-pager-pages" aria-label="Pages">
          <button type="button" className="icon-button" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })} aria-label="Previous page"><Icon name="back" size={16} /></button>
          {nearbyPages(page, pageCount).map((number) => (
            <button key={number} type="button" className="page-number" aria-current={number === page ? 'page' : undefined} onClick={() => onChange({ page: number })}>{number}</button>
          ))}
          <button type="button" className="icon-button" disabled={page >= pageCount} onClick={() => onChange({ page: page + 1 })} aria-label="Next page"><Icon name="right" size={16} /></button>
        </nav>
      </div>
    </div>
  );
}
