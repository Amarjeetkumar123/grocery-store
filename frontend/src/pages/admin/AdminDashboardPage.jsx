import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { formatRupees } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { Icon } from '../../Icon.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { SalesSources, SalesWeekChart } from './dashboard/SalesCharts.jsx';
import { StockAlerts, TomorrowSlots, TopItems } from './dashboard/DashboardLists.jsx';
import { longDateOf } from './dashboard/dashboardDates.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// tone colours the icon: green, blue, amber or red.
function Tile({ to, label, value, note, noteClass = 'hint', icon, tone }) {
  return (
    <Link to={to} className="card stat-tile tile-link">
      <p className="stat-tile-top">{label}<span className={`stat-icon stat-icon-${tone}`}><Icon name={icon} /></span></p>
      <strong>{value}</strong>
      <p className={noteClass}>{note}</p>
    </Link>
  );
}

function Tiles({ dashboard }) {
  const { slots, salesWeek, stock, today, tomorrow, cashWithRiders, ridersWithCash } = dashboard;
  const ordersTomorrow = slots.reduce((sum, slot) => sum + slot.ordersTaken, 0);
  const waiting = slots.reduce((sum, slot) => sum + slot.ordersWaiting, 0);
  const salesToday = salesWeek.byDay.find((day) => day.date === today) ?? { sales: 0, orders: 0 };
  return (
    <div className="stat-tiles">
      <Tile to={`/admin/orders?from=${tomorrow}&to=${tomorrow}`} label="Orders for tomorrow" value={ordersTomorrow} icon="box" tone="green"
        note={waiting > 0 ? `${waiting} new, waiting to confirm` : 'None waiting to confirm'} noteClass={waiting > 0 ? 'tile-note-green' : 'hint'} />
      <Tile to="/admin/reports" label="Sales today" value={formatRupees(salesToday.sales)} icon="tag" tone="blue" note={`${plural(salesToday.orders, 'order')} delivered`} />
      <Tile to="/admin/cash-check" label="Cash with riders" value={formatRupees(cashWithRiders)} icon="cash" tone="amber"
        note={cashWithRiders > 0 ? `${plural(ridersWithCash, 'rider')} yet to hand over` : 'All handed over'} noteClass={cashWithRiders > 0 ? 'tile-note-amber' : 'hint'} />
      <Tile to="/admin/stock" label="Low / out of stock" value={stock.outOfStock + stock.lowStock} icon="layers" tone="red"
        note={`${plural(stock.outOfStock, 'item')} out of stock`} noteClass={stock.outOfStock > 0 ? 'tile-note-red' : 'hint'} />
    </div>
  );
}

// The owner's first screen: what's coming tomorrow, money, and stock to act on.
export function AdminDashboardPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/dashboard');
  return (
    <>
      <AdminPageHeader title="Dashboard" subtitle={data ? longDateOf(data.today) : null} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Tiles dashboard={data} />
          <div className="dashboard-columns">
            <div className="dashboard-column">
              <SalesWeekChart salesWeek={data.salesWeek} salesWeekBefore={data.salesWeekBefore} today={data.today} />
              <TomorrowSlots slots={data.slots} tomorrow={data.tomorrow} />
            </div>
            <div className="dashboard-column">
              <SalesSources salesWeek={data.salesWeek} />
              <StockAlerts alerts={data.stock.alerts} />
              <TopItems items={data.salesWeek.topItems} />
              {data.salesWeek.notifyMe.map((interest) => (
                <p key={interest.categoryName} className="notice notice-warning">{interest.categoryName}: {plural(interest.requests, 'customer')} tapped "Notify me".</p>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
