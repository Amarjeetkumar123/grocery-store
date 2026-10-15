import { Fragment } from 'react';
import { callApi } from '../../../apiClient.js';
import { useApiData } from '../../../useApiData.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { formatRupees, formatShortDate } from '../../../formatting.js';
import { LoadingOrError } from '../../../components/LoadingOrError.jsx';
import { Icon } from '../../../Icon.jsx';
import { StatusPill } from '../../orders/OrderParts.jsx';

const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

// "Tower A · Flat 34" on top, the society or area underneath.
function AddressCell({ customer }) {
  const place = customer.zoneType === 'society' ? `${customer.towerName} · Flat ${customer.flatNumber}` : `${customer.houseNumber}, ${customer.street}`;
  return <div className="two-line"><span>{place}</span><small>{customer.zoneName}</small></div>;
}

function StatusCell({ customer }) {
  if (customer.blocked) return <span className="pill pill-red">Blocked</span>;
  if (customer.phoneConfirmed) return <span className="pill pill-green">Phone confirmed</span>;
  return <span className="pill pill-amber">Not confirmed</span>;
}

// Confirm phone stays one tap away; Block hides in the "more" menu so it is not pressed by mistake.
function CustomerActions({ customer, onChanged }) {
  const { saving, error, save } = useSaveRequest();
  async function setFlags(flags, question) {
    if (question && !window.confirm(question)) return;
    if (await save(() => callApi(`/api/admin/customers/${customer.id}`, { method: 'PUT', body: flags }))) onChanged();
  }
  return (
    <div className="row-actions">
      {customer.blocked && <button type="button" className="button button-compact button-outline" disabled={saving} onClick={() => setFlags({ blocked: false })}>Unblock</button>}
      {!customer.blocked && !customer.phoneConfirmed && (
        <button type="button" className="button button-compact button-outline" disabled={saving} onClick={() => setFlags({ phoneConfirmed: true })}><Icon name="check" size={16} /> Confirm phone</button>
      )}
      <details className="row-menu">
        <summary className="icon-button" aria-label={`More for ${customer.name}`}><Icon name="more" /></summary>
        <div className="row-menu-list">
          <a href={`tel:+91${customer.phone}`}><Icon name="phone" size={16} /> Call</a>
          {!customer.blocked && (
            <button type="button" className="danger-text" disabled={saving} onClick={() => setFlags({ blocked: true }, `Block ${customer.name}? They will not be able to order.`)}>
              <Icon name="close" size={16} /> Block
            </button>
          )}
        </div>
      </details>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function OrderHistory({ customerId }) {
  const { data, error, loading } = useApiData(`/api/admin/orders?customerId=${customerId}`);
  if (!data) return <LoadingOrError loading={loading} error={error} />;
  return (
    <ul className="order-history">
      {[...data.orders].reverse().map((order) => (
        <li key={order.orderNumber}>
          <strong>#{order.orderNumber}</strong><span className="hint">{formatShortDate(order.createdAt)}</span>{formatRupees(order.total)}<StatusPill status={order.status} />
          {order.cancelReason && <span className="hint">{order.cancelReason}</span>}
        </li>
      ))}
    </ul>
  );
}

function OrdersCell({ customer, expanded, onToggle }) {
  if (customer.orderCount === 0) return <span className="hint">No orders</span>;
  return (
    <div className="two-line">
      <button type="button" className="text-button orders-toggle" onClick={onToggle} aria-expanded={expanded}>
        {customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'} <Icon name="down" size={14} />
      </button>
      {customer.lastOrderAt && <small>last {formatShortDate(customer.lastOrderAt)}</small>}
    </div>
  );
}

export function CustomerRow({ customer, expanded, onToggle, onChanged }) {
  const rowClass = customer.blocked ? 'row-inactive' : expanded ? 'row-open' : '';
  return (
    <Fragment>
      <tr className={rowClass}>
        <td>
          <div className="person-cell">
            <span className="person-initials" aria-hidden="true">{initialsOf(customer.name)}</span>
            <div className="two-line"><strong>{customer.name}</strong><small>{customer.email}</small></div>
          </div>
        </td>
        <td>
          <div className="phone-cell">{customer.phone}
            <a className="icon-button icon-button-outline icon-button-whatsapp" href={`https://wa.me/91${customer.phone}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${customer.name}`}><Icon name="chat" /></a>
          </div>
        </td>
        <td><AddressCell customer={customer} /></td>
        <td><OrdersCell customer={customer} expanded={expanded} onToggle={onToggle} /></td>
        <td><StatusCell customer={customer} /></td>
        <td><CustomerActions customer={customer} onChanged={onChanged} /></td>
      </tr>
      {expanded && <tr className="history-row"><td colSpan={6}><OrderHistory customerId={customer.id} /></td></tr>}
    </Fragment>
  );
}
