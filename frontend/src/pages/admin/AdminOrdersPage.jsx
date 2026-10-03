import { Link } from 'react-router';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { BoardFilters } from './orders/BoardFilters.jsx';
import { OrderBoardCard } from './orders/OrderBoardCard.jsx';
import { filterOrders, useBoardFilters, useDayOrders, useRiders } from './orders/orderBoardData.js';

const columns = [
  { status: 'new', title: 'New' },
  { status: 'confirmed', title: 'Confirmed' },
  { status: 'packed', title: 'Packed' },
  { status: 'out_for_delivery', title: 'Out for delivery' },
  { status: 'delivered', title: 'Delivered' },
];

function BoardColumn({ title, orders, riders, onChanged }) {
  return (
    <section className="board-column" aria-label={title}>
      <h2>{title} <span className="board-count">{orders.length}</span></h2>
      {orders.map((order) => <OrderBoardCard key={order.orderNumber} order={order} riders={riders} onChanged={onChanged} />)}
    </section>
  );
}

// New orders appear on their own: the board asks the server every 20 seconds.
export function AdminOrdersPage() {
  const { filters, setFilter, queryString } = useBoardFilters();
  const { orders, data, error, loading, reload } = useDayOrders(filters.date);
  const riders = useRiders();
  const shown = filterOrders(orders, filters);
  const cancelledCount = shown.filter((order) => order.status === 'cancelled').length;
  return (
    <>
      <AdminPageHeader title="Orders">
        <Link to={`/admin/picking-list?${queryString}`} className="button button-compact button-outline"><Icon name="layers" /> Picking list</Link>
        <Link to={`/admin/delivery-list?${queryString}`} className="button button-compact"><Icon name="truck" /> Delivery list</Link>
      </AdminPageHeader>
      <BoardFilters orders={orders} filters={filters} setFilter={setFilter} />
      <LoadingOrError loading={loading && !data} error={data ? null : error} onRetry={reload} />
      {data && (
        <div className="order-board">
          {columns.map((column) => (
            <BoardColumn key={column.status} title={column.title} riders={riders} onChanged={reload}
              orders={shown.filter((order) => order.status === column.status)} />
          ))}
        </div>
      )}
      {cancelledCount > 0 && <p className="hint">{cancelledCount} cancelled {cancelledCount === 1 ? 'order is' : 'orders are'} not shown.</p>}
    </>
  );
}
