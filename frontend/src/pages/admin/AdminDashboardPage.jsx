import { Link } from 'react-router';
import { useApiData } from '../../useApiData.js';
import { addDays, formatRupees, formatShortDate, formatTimeRange } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { SalesByDayChart } from './reports/SalesByDayChart.jsx';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const shortDay = (isoDate) => formatShortDate(`${isoDate}T12:00:00Z`);

function Tile({ to, label, value, note, noteClass = 'hint' }) {
  return (
    <Link to={to} className="card stat-tile tile-link">
      <p className="hint">{label}</p>
      <strong>{value}</strong>
      <p className={noteClass}>{note}</p>
    </Link>
  );
}

function Tiles({ dashboard }) {
  const { slots, salesWeek, stock, today, tomorrow, cashWithRiders } = dashboard;
  const ordersTomorrow = slots.reduce((sum, slot) => sum + slot.ordersTaken, 0);
  const waiting = slots.reduce((sum, slot) => sum + slot.ordersWaiting, 0);
  const salesToday = salesWeek.byDay.find((day) => day.date === today) ?? { sales: 0, orders: 0 };
  return (
    <div className="stat-tiles">
      <Tile to={`/admin/orders?from=${tomorrow}&to=${tomorrow}`} label="Orders for tomorrow" value={ordersTomorrow}
        note={waiting > 0 ? `${waiting} new, waiting to confirm` : 'None waiting to confirm'} noteClass={waiting > 0 ? 'tile-note-green' : 'hint'} />
      <Tile to="/admin/reports" label="Sales today" value={formatRupees(salesToday.sales)} note={`${plural(salesToday.orders, 'order')} delivered`} />
      <Tile to="/admin/cash-check" label="Cash with riders" value={formatRupees(cashWithRiders)}
        note={cashWithRiders > 0 ? 'Not handed over yet' : 'All handed over'} noteClass={cashWithRiders > 0 ? 'tile-note-amber' : 'hint'} />
      <Tile to="/admin/stock" label="Low / out of stock" value={stock.outOfStock + stock.lowStock}
        note={`${plural(stock.outOfStock, 'item')} out of stock`} noteClass={stock.outOfStock > 0 ? 'tile-note-red' : 'hint'} />
    </div>
  );
}

function SlotRow({ slot, tomorrow }) {
  const filledPercent = slot.slotId ? Math.min((slot.ordersTaken / slot.maximumOrders) * 100, 100) : 0;
  return (
    <tr>
      <td><strong>{slot.zoneName}</strong></td>
      <td className="wide-only"><span className={`pill ${slot.zoneType === 'society' ? 'pill-blue' : 'pill-gray'}`}>{slot.zoneType === 'society' ? 'Society' : 'Local area'}</span></td>
      {slot.slotId ? (
        <>
          <td className="no-wrap">{formatTimeRange(slot.startTime, slot.endTime)}</td>
          <td className="wide-only"><div className="fill-bar" aria-hidden="true"><span className={filledPercent >= 90 ? 'fill-bar-almost-full' : ''} style={{ width: `${filledPercent}%` }} /></div></td>
          <td className="number no-wrap">{slot.ordersTaken} / {slot.maximumOrders}</td>
        </>
      ) : (
        <><td className="hint" colSpan={2}>No delivery {shortDay(tomorrow)}</td><td className="number">—</td></>
      )}
    </tr>
  );
}

function SlotTable({ slots, tomorrow }) {
  return (
    <section className="card">
      <div className="card-heading"><h2>Tomorrow's slots</h2><span className="hint">{shortDay(tomorrow)}</span></div>
      {slots.length === 0 ? <p className="hint">No delivery zones yet. Add them in Zones &amp; slots.</p> : (
        <div className="table-box">
          <table className="admin-table">
            <thead><tr><th>Zone</th><th className="wide-only">Type</th><th>Slot</th><th className="wide-only">Filled</th><th className="number">Orders</th></tr></thead>
            <tbody>{slots.map((slot) => <SlotRow key={`${slot.zoneId}-${slot.slotId}`} slot={slot} tomorrow={tomorrow} />)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StockPill({ item }) {
  if (item.outOfStock) return <span className="pill pill-red">0 left</span>;
  if (item.lowStock) return <span className="pill pill-amber">{item.stock} left</span>;
  return <span className="pill pill-amber">Expiring</span>;
}

function StockAlerts({ alerts }) {
  return (
    <section className="card">
      <div className="card-heading"><h2>Stock alerts</h2><Link to="/admin/stock" className="text-button">Open stock</Link></div>
      {alerts.length === 0 ? <p className="hint">All stock is fine.</p> : (
        <ul className="dashboard-list">
          {alerts.map((item) => (
            <li key={item.packSizeId}>
              <span><strong>{item.productName}</strong> <span className="hint">{item.label}{!item.outOfStock && !item.lowStock && item.bestBefore && ` · expires ${shortDay(item.bestBefore)}`}</span></span>
              <StockPill item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopItems({ items }) {
  return (
    <section className="card">
      <h2>Top items this week</h2>
      {items.length === 0 ? <p className="hint">No deliveries in the last 7 days.</p> : (
        <ul className="dashboard-list">
          {items.slice(0, 5).map((item) => <li key={`${item.productName}-${item.packLabel}`}><span>{item.productName} {item.packLabel}</span><strong>{item.quantity}</strong></li>)}
        </ul>
      )}
    </section>
  );
}

// All 7 days, so a day without sales shows as an empty bar.
function SalesWeek({ salesWeek, today }) {
  if (salesWeek.byDay.length === 0) return <section className="card"><h2>Sales · last 7 days</h2><p className="hint">No deliveries in the last 7 days.</p></section>;
  const days = [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => addDays(today, -daysAgo))
    .map((date) => salesWeek.byDay.find((day) => day.date === date) ?? { date, sales: 0, orders: 0 });
  return <SalesByDayChart days={days} />;
}

// The owner's first screen: what's coming tomorrow, money, and stock to act on.
export function AdminDashboardPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/dashboard');
  return (
    <>
      <AdminPageHeader title="Dashboard" />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Tiles dashboard={data} />
          <div className="dashboard-columns">
            <div className="dashboard-column">
              <SlotTable slots={data.slots} tomorrow={data.tomorrow} />
              <SalesWeek salesWeek={data.salesWeek} today={data.today} />
            </div>
            <div className="dashboard-column">
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
