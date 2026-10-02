import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { callApi } from '../../apiClient.js';
import { formatMonthYear } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

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
      {stockItem.lowStock && <span className="pill pill-amber">Low</span>}
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
      <td className="badge-cell"><StockBadges stockItem={stockItem} /></td>
      <td>{formatMonthYear(stockItem.bestBefore) || '—'}</td>
      <td><StockAdjuster stockItem={stockItem} onAdjusted={onAdjusted} /></td>
    </tr>
  );
}

export function AdminStockPage() {
  const [status, setStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText.trim());
  const query = new URLSearchParams({ status, search: debouncedSearchText }).toString();
  const { data, error, loading, reload } = useApiData(`/api/admin/stock?${query}`);

  return (
    <>
      <AdminPageHeader title="Stock" />
      <div className="filter-row">
        <div className="chip-row" role="group" aria-label="Show">
          {statusFilters.map((filter) => (
            <button key={filter.status} type="button" className="chip" aria-pressed={status === filter.status}
              onClick={() => setStatus(filter.status)}>{filter.label}</button>
          ))}
        </div>
        <label className="search-input admin-search">
          <Icon name="search" />
          <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search product" aria-label="Search stock" />
        </label>
      </div>
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.stockItems.length === 0 && <p className="hint centered">Nothing to show here.</p>}
      {data && data.stockItems.length > 0 && (
        <div className="table-box">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Pack</th><th className="number">In stock</th><th /><th>Best before</th><th>Add or remove stock</th></tr></thead>
            <tbody>{data.stockItems.map((stockItem) => <StockRow key={stockItem.packSizeId} stockItem={stockItem} onAdjusted={reload} />)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
