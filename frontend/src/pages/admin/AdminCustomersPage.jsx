import { Fragment, useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useDebouncedValue } from '../../useDebouncedValue.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { deliveryAddressLine, formatRupees, formatShortDate } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { StatusPill } from '../orders/OrderParts.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

function OrderHistory({ customerId }) {
  const { data, error, loading } = useApiData(`/api/admin/orders?customerId=${customerId}`);
  if (!data) return <LoadingOrError loading={loading} error={error} />;
  if (data.orders.length === 0) return <p className="hint">No orders yet.</p>;
  return (
    <ul className="order-history">
      {[...data.orders].reverse().map((order) => (
        <li key={order.orderNumber}>
          <strong>#{order.orderNumber}</strong> · {formatShortDate(order.createdAt)} · {formatRupees(order.total)} <StatusPill status={order.status} />
          {order.cancelReason && <span className="hint"> · {order.cancelReason}</span>}
        </li>
      ))}
    </ul>
  );
}

// Phone confirmed after their WhatsApp message; blocked customers cannot order.
function CustomerFlags({ customer, onChanged }) {
  const { saving, error, save } = useSaveRequest();
  async function setFlag(flags, question) {
    if (question && !window.confirm(question)) return;
    if (await save(() => callApi(`/api/admin/customers/${customer.id}`, { method: 'PUT', body: flags }))) onChanged();
  }
  return (
    <>
      {customer.phoneConfirmed
        ? <span className="pill pill-green">Phone confirmed</span>
        : <button type="button" className="button button-compact button-outline" disabled={saving} onClick={() => setFlag({ phoneConfirmed: true })}>Confirm phone</button>}
      {customer.blocked
        ? <button type="button" className="text-button small-text-button" disabled={saving} onClick={() => setFlag({ blocked: false })}>Unblock</button>
        : <button type="button" className="text-button small-text-button danger-text" disabled={saving}
          onClick={() => setFlag({ blocked: true }, `Block ${customer.name}? They will not be able to order.`)}>Block</button>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

function CustomerRow({ customer, expanded, onToggle, onChanged }) {
  return (
    <Fragment>
      <tr className={customer.blocked ? 'row-inactive' : ''}>
        <td><strong>{customer.name}</strong>{customer.blocked && <span className="pill pill-red">Blocked</span>}<br /><span className="hint">{customer.email}</span></td>
        <td><a href={`tel:+91${customer.phone}`}>{customer.phone}</a></td>
        <td>{deliveryAddressLine(customer)}</td>
        <td>
          <button type="button" className="text-button small-text-button" onClick={onToggle} aria-expanded={expanded}>{customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}</button>
          {customer.lastOrderAt && <span className="hint"> · last {formatShortDate(customer.lastOrderAt)}</span>}
        </td>
        <td className="badge-cell"><CustomerFlags customer={customer} onChanged={onChanged} /></td>
      </tr>
      {expanded && <tr><td colSpan={5}><OrderHistory customerId={customer.id} /></td></tr>}
    </Fragment>
  );
}

export function AdminCustomersPage() {
  const [searchText, setSearchText] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const debouncedSearchText = useDebouncedValue(searchText.trim());
  const { data, error, loading, reload } = useApiData(`/api/admin/customers?search=${encodeURIComponent(debouncedSearchText)}`);
  return (
    <>
      <AdminPageHeader title="Customers" />
      <input type="search" className="input admin-search" placeholder="Name, phone, email, flat or street" aria-label="Search customers"
        value={searchText} onChange={(event) => setSearchText(event.target.value)} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && data.customers.length === 0 && <p className="hint">No customers found.</p>}
      {data && data.customers.length > 0 && (
        <div className="table-box">
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Orders</th><th>Checks</th></tr></thead>
            <tbody>
              {data.customers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} expanded={expandedCustomerId === customer.id} onChanged={reload}
                  onToggle={() => setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
