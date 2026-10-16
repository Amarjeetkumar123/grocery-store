import { useState } from 'react';
import { Link } from 'react-router';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { formatShortDate } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { StarRow } from '../../components/Rating.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';

const showFilters = [
  { show: 'all', label: 'All' },
  { show: 'low', label: '1–2 ★' },
  { show: 'text', label: 'With text' },
  { show: 'hidden', label: 'Hidden' },
];

function ReviewFilters({ filters, onChange }) {
  return (
    <div className="filter-row">
      <label className="search-input admin-search">
        <Icon name="search" size={16} />
        <input type="search" value={filters.search} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Product or customer" aria-label="Search reviews" />
      </label>
      <div className="segmented date-presets" role="group" aria-label="Show">
        {showFilters.map(({ show, label }) => (
          <button key={show} type="button" aria-pressed={filters.show === show} onClick={() => onChange({ show })}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// The switch hides a review from the shop; it is kept, and can be shown again.
function ShownSwitch({ review, onChanged }) {
  const { saving, error, save } = useSaveRequest();
  const showToast = useToast();
  async function toggle(event) {
    const hidden = !event.target.checked;
    if (!(await save(() => callApi(`/api/admin/reviews/${review.id}`, { method: 'PUT', body: { hidden } })))) return;
    showToast(hidden ? `${review.customerName}'s review hidden from the shop` : `${review.customerName}'s review shown again`);
    onChanged();
  }
  return (
    <>
      <input type="checkbox" className="switch switch-green" role="switch" checked={!review.hidden} disabled={saving} onChange={toggle}
        aria-label={`Show ${review.customerName}'s review in the shop`} />
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

function ReviewRow({ review, onChanged }) {
  return (
    <tr className={review.hidden ? 'row-hidden' : undefined}>
      <td><Link to={`/product/${review.productId}`} className="review-product-link" target="_blank">{review.productName}</Link></td>
      <td className="nowrap">{review.customerName}<p className="hint">{review.zoneName}</p></td>
      <td className={review.rating <= 2 ? 'review-low' : undefined}><StarRow rating={review.rating} size={12} /></td>
      <td className="review-admin-text">
        {review.body || <span className="hint">Stars only</span>}
        {review.tags.length > 0 && <div className="review-item-tags">{review.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      </td>
      <td className="nowrap">{formatShortDate(review.createdAt)}</td>
      <td><ShownSwitch review={review} onChanged={onChanged} /></td>
    </tr>
  );
}

function ReviewTable({ data, onChanged, onPageChange }) {
  return (
    <div className="table-box">
      <div className="table-scroll">
        <table className="admin-table review-table">
          <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th>Shown</th></tr></thead>
          <tbody>{data.reviews.map((review) => <ReviewRow key={review.id} review={review} onChanged={onChanged} />)}</tbody>
        </table>
      </div>
      <TablePager page={data.page} pageCount={data.pageCount} pageSize={data.pageSize} total={data.total} shownCount={data.reviews.length} onChange={onPageChange} />
    </div>
  );
}

function subtitleFor(totals) {
  if (!totals) return null;
  if (totals.shownCount === 0 && totals.hiddenCount === 0) return 'No ratings yet';
  const average = totals.average ? `${totals.average.toFixed(1)} average · ` : '';
  return `${average}${totals.shownCount} ${totals.shownCount === 1 ? 'rating' : 'ratings'} · ${totals.hiddenCount} hidden`;
}

// Every rating customers have left. Low ratings are easy to find; spam can be hidden.
export function AdminReviewsPage() {
  const [filters, setFilters] = useState({ search: '', show: 'all', page: 1, pageSize: 25 });
  const changeFilters = (changes) => setFilters((previous) => ({ ...previous, page: 1, ...changes }));
  const debouncedSearchText = useDebouncedValue(filters.search.trim());
  const { data, error, loading, reload } = useApiData(`/api/admin/reviews?${new URLSearchParams({ ...filters, search: debouncedSearchText })}`);
  return (
    <div className="fit-screen-page">
      <AdminPageHeader title="Reviews" subtitle={subtitleFor(data?.totals)} />
      <ReviewFilters filters={filters} onChange={changeFilters} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.total === 0 && <p className="hint centered">No reviews here yet. Customers can rate items once their order is delivered.</p>}
      {data && data.total > 0 && <ReviewTable data={data} onChanged={reload} onPageChange={(changes) => setFilters((previous) => ({ ...previous, ...changes }))} />}
    </div>
  );
}
