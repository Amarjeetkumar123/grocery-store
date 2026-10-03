import { Icon } from '../../Icon.jsx';
import { formatDeliveryDay } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { BoardFilters } from './orders/BoardFilters.jsx';
import { filterOrders, useBoardFilters, useDayOrders } from './orders/orderBoardData.js';

// Orders still to be packed.
const toPackStatuses = ['new', 'confirmed'];

// One line per pack size: how many to take off the shelf in total.
function totalsByPackSize(orders) {
  const lines = new Map();
  for (const order of orders) {
    for (const item of order.items) {
      const line = lines.get(item.packSizeId) ?? { ...item, quantity: 0, orderCount: 0 };
      lines.set(item.packSizeId, { ...line, quantity: line.quantity + item.quantity, orderCount: line.orderCount + 1 });
    }
  }
  return [...lines.values()].sort((first, second) => first.productName.localeCompare(second.productName) || first.packLabel.localeCompare(second.packLabel));
}

function PickingTable({ lines }) {
  return (
    <div className="table-box">
      <table className="admin-table picking-table">
        <thead><tr><th className="print-only">✓</th><th>Product</th><th>Pack</th><th>Quantity</th><th>In orders</th></tr></thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.packSizeId}>
              <td className="print-only">☐</td>
              <td><strong>{line.productName}</strong></td>
              <td>{line.packLabel}</td>
              <td className="stock-count"><strong>{line.quantity}</strong></td>
              <td>{line.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPickingListPage() {
  const { filters, setFilter } = useBoardFilters();
  const { orders, data, error, loading, reload } = useDayOrders(filters.date);
  const toPack = filterOrders(orders, { ...filters, search: '' }).filter((order) => toPackStatuses.includes(order.status));
  const notConfirmed = toPack.filter((order) => order.status === 'new').length;
  return (
    <>
      <AdminPageHeader title={`Picking list · ${formatDeliveryDay(filters.date)}`}>
        <button type="button" className="button button-compact button-outline" onClick={() => window.print()}><Icon name="layers" /> Print</button>
      </AdminPageHeader>
      <BoardFilters orders={orders} filters={filters} setFilter={setFilter} showSearch={false} />
      <LoadingOrError loading={loading && !data} error={data ? null : error} onRetry={reload} />
      {data && (
        <>
          <p className="hint">
            {toPack.length} {toPack.length === 1 ? 'order' : 'orders'} to pack
            {notConfirmed > 0 && ` (${notConfirmed} not confirmed yet)`}. Packed and cancelled orders are not included.
          </p>
          {toPack.length > 0 && <PickingTable lines={totalsByPackSize(toPack)} />}
        </>
      )}
    </>
  );
}
