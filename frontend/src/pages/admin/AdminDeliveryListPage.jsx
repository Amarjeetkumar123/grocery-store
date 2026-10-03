import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useSaveRequest } from '../../useSaveRequest.js';
import { formatDeliveryDay, formatRupees } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { StatusPill } from '../orders/OrderParts.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { BoardFilters, DayField } from './orders/BoardFilters.jsx';
import { RiderPicker } from './orders/RiderPicker.jsx';
import { mapLinkFor } from './orders/customerContactLinks.js';
import { filterOrders, itemCountOf, shortAddressOf, timeOptionsOf, useBoardFilters, useDayOrders, useRiders, zoneOptionsOf } from './orders/orderBoardData.js';

// Confirmed orders onwards; new ones are checked by the owner first.
const onTheListStatuses = ['confirmed', 'packed', 'out_for_delivery'];

// Zone -> tower (society) or street (local area) -> orders, in walking order.
function groupForDelivery(orders) {
  const zones = new Map();
  const sorted = [...orders].sort((first, second) => shortAddressOf(first).localeCompare(shortAddressOf(second), 'en', { numeric: true }));
  for (const order of sorted) {
    const zone = zones.get(order.zoneId) ?? { zoneName: order.address.zoneName, orders: [] };
    zones.set(order.zoneId, { ...zone, orders: [...zone.orders, order] });
  }
  return [...zones.values()].sort((first, second) => first.zoneName.localeCompare(second.zoneName));
}

// Everyone in a zone usually goes with one rider; the picker sets them all.
function sharedRiderOf(orders) {
  const riderIds = new Set(orders.map((order) => order.rider?.id ?? null));
  return riderIds.size === 1 ? orders[0].rider : null;
}

function DeliveryRow({ order }) {
  const mapLink = mapLinkFor(order);
  return (
    <tr>
      <td><strong>#{order.orderNumber}</strong></td>
      <td>{shortAddressOf(order)}{order.address.landmark && <span className="hint"> · near {order.address.landmark}</span>}</td>
      <td>{order.address.customerName}<br /><a href={`tel:+91${order.address.customerPhone}`}>{order.address.customerPhone}</a></td>
      <td>{itemCountOf(order)} items</td>
      <td><strong>{formatRupees(order.total)}</strong></td>
      <td><StatusPill status={order.status} /></td>
      <td>{order.rider?.name ?? '—'}</td>
      <td>{mapLink && <a href={mapLink} target="_blank" rel="noreferrer" className="icon-button" aria-label="Open in Google Maps"><Icon name="pin" /></a>}</td>
    </tr>
  );
}

function ZoneGroup({ group, riders, onChanged }) {
  const { account } = useAuthentication();
  const { error, save } = useSaveRequest();
  return (
    <section className="card delivery-group">
      <div className="card-heading">
        <h2>{group.zoneName} · {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}</h2>
        {account.role === 'owner' && (
          <RiderPicker label="Rider for all" orderNumbers={group.orders.map((order) => order.orderNumber)}
            rider={sharedRiderOf(group.orders)} riders={riders} save={save} onChanged={onChanged} />
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="table-box">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Address</th><th>Customer</th><th>Items</th><th>To collect</th><th>Status</th><th>Rider</th><th /></tr></thead>
          <tbody>{group.orders.map((order) => <DeliveryRow key={order.orderNumber} order={order} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminDeliveryListPage() {
  const { filters, setFilter } = useBoardFilters();
  const { orders, data, error, loading, reload } = useDayOrders(filters.date);
  const riders = useRiders();
  const onTheList = filterOrders(orders, { ...filters, search: '' }).filter((order) => onTheListStatuses.includes(order.status));
  return (
    <>
      <AdminPageHeader title={`Delivery list · ${formatDeliveryDay(filters.date)}`}>
        <button type="button" className="button button-compact button-outline" onClick={() => window.print()}><Icon name="layers" /> Print</button>
      </AdminPageHeader>
      <BoardFilters filters={filters} setFilter={setFilter} zoneOptions={zoneOptionsOf(orders)} timeOptions={timeOptionsOf(orders)} showSearch={false}>
        <DayField filters={filters} setFilter={setFilter} />
      </BoardFilters>
      <LoadingOrError loading={loading && !data} error={data ? null : error} onRetry={reload} />
      {data && onTheList.length === 0 && <p className="hint">No confirmed orders to deliver for this day and slot yet.</p>}
      {groupForDelivery(onTheList).map((group) => <ZoneGroup key={group.zoneName} group={group} riders={riders} onChanged={reload} />)}
    </>
  );
}
