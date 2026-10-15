import { Link } from 'react-router';
import { formatTimeRange } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { BoardFilters, DateRangeFields } from './orders/BoardFilters.jsx';
import { OrderBoardCard } from './orders/OrderBoardCard.jsx';
import { UpcomingDays } from './orders/UpcomingDays.jsx';
import { dateRangeLabel, listQueryOf, useBoardFilters, useBoardOrders, useRiders } from './orders/orderBoardData.js';

const columns = [
  { status: 'new', title: 'New', empty: 'No new orders' },
  { status: 'confirmed', title: 'Confirmed', empty: 'No orders to pack' },
  { status: 'packed', title: 'Packed', empty: 'Nothing waiting for a rider' },
  { status: 'out_for_delivery', title: 'Out for delivery', empty: 'Nothing on the road' },
  { status: 'delivered', title: 'Delivered', empty: 'Nothing delivered yet' },
];

// The count is for every page; the cards are this page's.
function BoardColumn({ column, count, orders, riders, onChanged }) {
  return (
    <section className={`board-column board-column-${column.status}`} aria-label={column.title}>
      <h2><span className="board-dot" aria-hidden="true" />{column.title} <span className="board-count">{count}</span></h2>
      {orders.length === 0 && <p className="board-empty">{column.empty}</p>}
      {orders.map((order) => <OrderBoardCard key={order.orderNumber} order={order} riders={riders} onChanged={onChanged} />)}
    </section>
  );
}

function boardSummary(filters, statusCounts) {
  const waiting = statusCounts.new ?? 0;
  return `${dateRangeLabel(filters)} · ${waiting > 0 ? `${waiting} new, waiting to confirm` : 'nothing waiting to confirm'}`;
}

function PageButtons({ page, pageCount, setFilter }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="page-buttons" aria-label="Pages">
      <button type="button" className="button button-compact button-outline" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
      <span className="hint">Page {page} of {pageCount}</span>
      <button type="button" className="button button-compact button-outline" disabled={page >= pageCount} onClick={() => setFilter('page', String(page + 1))}>Next</button>
    </nav>
  );
}

function filterOptionsOf(data) {
  const options = data?.filterOptions ?? { zones: [], timeWindows: [] };
  return {
    zoneOptions: options.zones.map((zone) => ({ value: String(zone.id), label: zone.name })),
    timeOptions: options.timeWindows.map((window) => ({ value: `${window.startTime}-${window.endTime}`, label: formatTimeRange(window.startTime, window.endTime) })),
  };
}

// New orders appear on their own: the board asks the server every 20 seconds.
export function AdminOrdersPage() {
  const { filters, setFilter, setFilters } = useBoardFilters();
  const { orders, data, error, loading, reload } = useBoardOrders(filters);
  const riders = useRiders();
  const statusCounts = data?.statusCounts ?? {};
  const oneDay = filters.from && filters.from === filters.to ? filters.from : null;
  return (
    <>
      <AdminPageHeader title="Orders" subtitle={boardSummary(filters, statusCounts)}>
        <Link to={`/admin/picking-list?${listQueryOf(filters)}`} className="button button-compact button-outline"><Icon name="layers" /> Picking list</Link>
        <Link to={`/admin/delivery-list?${listQueryOf(filters)}`} className="button button-compact button-outline"><Icon name="truck" /> Delivery list</Link>
      </AdminPageHeader>
      <BoardFilters filters={filters} setFilter={setFilter} {...filterOptionsOf(data)}>
        <DateRangeFields filters={filters} setFilter={setFilter} setFilters={setFilters} />
      </BoardFilters>
      <UpcomingDays days={data?.upcomingDays ?? []} selectedDate={oneDay} onSelect={(date) => setFilters({ from: date, to: date })} />
      <LoadingOrError loading={loading && !data} error={data ? null : error} onRetry={reload} />
      {data && (
        <div className="order-board">
          {columns.map((column) => (
            <BoardColumn key={column.status} column={column} count={statusCounts[column.status] ?? 0} riders={riders} onChanged={reload}
              orders={orders.filter((order) => order.status === column.status)} />
          ))}
        </div>
      )}
      {data && <PageButtons page={data.page} pageCount={data.pageCount} setFilter={setFilter} />}
      {statusCounts.cancelled > 0 && <p className="hint">{statusCounts.cancelled} cancelled {statusCounts.cancelled === 1 ? 'order is' : 'orders are'} hidden.</p>}
    </>
  );
}
