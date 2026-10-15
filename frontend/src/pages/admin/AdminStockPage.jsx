import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { callApi } from '../../apiClient.js';
import { formatMonthYear } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';

const statusFilters = [
  { status: 'all', label: 'All' },
  { status: 'out', label: 'Out of stock' },
  { status: 'low', label: 'Low stock' },
  { status: 'expiring', label: 'Expiring in 30 days' },
];

// Type a number, then "Add" for new stock or "Remove" for damaged / miscounted.
function StockAdjuster({ stockItem, onAdjusted }) {
  const [quantityText, setQuantityText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const quantity = Number(quantityText);
  const quantityIsValid = Number.isInteger(quantity) && quantity > 0;

  async function adjust(direction) {
    setBusy(true);
    setErrorMessage(null);
    try {
      await callApi(`/api/admin/pack-sizes/${stockItem.packSizeId}/stock-adjustments`, {
        method: 'POST', body: { quantityChange: direction * quantity },
      });
      setQuantityText('');
      onAdjusted();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stock-adjuster">
      <input className="input input-small" inputMode="numeric" value={quantityText} placeholder="Qty"
        onChange={(event) => setQuantityText(event.target.value)} aria-label={`Quantity for ${stockItem.productName} ${stockItem.label}`} />
      <button type="button" className="button button-compact" disabled={!quantityIsValid || busy} onClick={() => adjust(1)}><Icon name="plus" size={16} /> Add</button>
      <button type="button" className="button button-outline button-compact" disabled={!quantityIsValid || busy} onClick={() => adjust(-1)}><Icon name="minus" size={16} /> Remove</button>
      {errorMessage && <p className="field-error">{errorMessage}</p>}
    </div>
  );
}

function StockBadges({ stockItem }) {
  return (
    <>
      {stockItem.outOfStock && <span className="pill pill-red">Out of stock</span>}
      {stockItem.lowStock && <span className="pill pill-amber">Low stock</span>}
      {stockItem.expiringSoon && <span className="pill pill-amber">Expiring</span>}
    </>
  );
}

function StockRow({ stockItem, onAdjusted }) {
  return (
    <tr>
      <td><strong>{stockItem.productName}</strong><p className="hint">{[stockItem.brand, stockItem.categoryName].filter(Boolean).join(' · ')}</p></td>
      <td>{stockItem.label}</td>
      <td className="number"><strong className="stock-count">{stockItem.stock}</strong></td>
      <td><div className="badge-cell"><StockBadges stockItem={stockItem} /></div></td>
      <td>{formatMonthYear(stockItem.bestBefore) || '—'}</td>
      <td><StockAdjuster stockItem={stockItem} onAdjusted={onAdjusted} /></td>
    </tr>
  );
}

function StockTable({ data, onAdjusted, onPageChange }) {
  return (
    <div className="table-box">
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Pack</th><th className="number">In stock</th><th>Status</th><th>Best before</th><th>Add or remove stock</th></tr></thead>
          <tbody>{data.stockItems.map((stockItem) => <StockRow key={stockItem.packSizeId} stockItem={stockItem} onAdjusted={onAdjusted} />)}</tbody>
        </table>
      </div>
      <TablePager page={data.page} pageCount={data.pageCount} pageSize={data.pageSize} total={data.total} shownCount={data.stockItems.length} onChange={onPageChange} />
    </div>
  );
}

// Same layout as Products: the table fills the window and scrolls inside, page buttons under it.
export function AdminStockPage() {
  const [filters, setFilters] = useState({ status: 'all', search: '', page: 1, pageSize: 25 });
  const changeFilters = (changes) => setFilters((previous) => ({ ...previous, page: 1, ...changes }));
  const debouncedSearchText = useDebouncedValue(filters.search.trim());
  const query = new URLSearchParams({ status: filters.status, search: debouncedSearchText, page: filters.page, pageSize: filters.pageSize }).toString();
  const { data, error, loading, reload } = useApiData(`/api/admin/stock?${query}`);
  const subtitle = data ? `${data.total} ${data.total === 1 ? 'pack size' : 'pack sizes'}` : null;

  return (
    <div className="fit-screen-page">
      <AdminPageHeader title="Stock" subtitle={subtitle} />
      <div className="filter-row">
        <label className="search-input admin-search">
          <Icon name="search" size={16} />
          <input type="search" value={filters.search} onChange={(event) => changeFilters({ search: event.target.value })} placeholder="Search product or brand" aria-label="Search stock" />
        </label>
        <div className="chip-row" role="group" aria-label="Show">
          {statusFilters.map((filter) => (
            <button key={filter.status} type="button" className="chip" aria-pressed={filters.status === filter.status}
              onClick={() => changeFilters({ status: filter.status })}>{filter.label}</button>
          ))}
        </div>
      </div>
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.total === 0 && <p className="hint centered">Nothing to show here.</p>}
      {data && data.total > 0 && <StockTable data={data} onAdjusted={reload} onPageChange={(changes) => setFilters((previous) => ({ ...previous, ...changes }))} />}
    </div>
  );
}
