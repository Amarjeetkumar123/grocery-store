import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { Icon } from '../../Icon.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { TablePager } from './TablePager.jsx';
import { CustomerRow } from './customers/CustomerRow.jsx';

const statusFilters = [
  { status: 'all', label: 'All' },
  { status: 'unconfirmed', label: 'Not confirmed' },
  { status: 'blocked', label: 'Blocked' },
];

function CustomerFilters({ filters, counts, onChange }) {
  const zones = useApiData('/api/admin/zones');
  return (
    <div className="filter-row">
      <label className="search-input admin-search">
        <Icon name="search" size={16} />
        <input type="search" value={filters.search} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Name, phone, email, flat or street" aria-label="Search customers" />
      </label>
      <div className="chip-row" role="group" aria-label="Show">
        {statusFilters.map(({ status, label }) => (
          <button key={status} type="button" className="chip" aria-pressed={filters.status === status} onClick={() => onChange({ status })}>
            {label}{counts && <span className="chip-count">{counts[status]}</span>}
          </button>
        ))}
      </div>
      <select className="input admin-select" value={filters.zoneId} onChange={(event) => onChange({ zoneId: event.target.value })} aria-label="Zone">
        <option value="">All zones</option>
        {zones.data?.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
      </select>
    </div>
  );
}

function CustomerTable({ data, onChanged, onPageChange }) {
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  return (
    <div className="table-box">
      <div className="table-scroll">
        <table className="admin-table customer-table">
          <thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Orders</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.customers.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} expanded={expandedCustomerId === customer.id} onChanged={onChanged}
                onToggle={() => setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id)} />
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={data.page} pageCount={data.pageCount} pageSize={data.pageSize} total={data.total} shownCount={data.customers.length} onChange={onPageChange} />
    </div>
  );
}

function subtitleFor(counts) {
  if (!counts) return null;
  const customers = `${counts.all} ${counts.all === 1 ? 'customer' : 'customers'}`;
  return counts.unconfirmed > 0 ? `${customers} · ${counts.unconfirmed} ${counts.unconfirmed === 1 ? 'phone' : 'phones'} not confirmed` : customers;
}

// Search, status and zone run on the server; the table fills the window and pages like Products.
export function AdminCustomersPage() {
  const [filters, setFilters] = useState({ search: '', status: 'all', zoneId: '', page: 1, pageSize: 25 });
  const changeFilters = (changes) => setFilters((previous) => ({ ...previous, page: 1, ...changes }));
  const debouncedSearchText = useDebouncedValue(filters.search.trim());
  const query = new URLSearchParams({ ...filters, search: debouncedSearchText }).toString();
  const { data, error, loading, reload } = useApiData(`/api/admin/customers?${query}`);
  return (
    <div className="fit-screen-page">
      <AdminPageHeader title="Customers" subtitle={subtitleFor(data?.counts)} />
      <CustomerFilters filters={filters} counts={data?.counts} onChange={changeFilters} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.total === 0 && <p className="hint centered">No customers found.</p>}
      {data && data.total > 0 && <CustomerTable data={data} onChanged={reload} onPageChange={(changes) => setFilters((previous) => ({ ...previous, ...changes }))} />}
    </div>
  );
}
