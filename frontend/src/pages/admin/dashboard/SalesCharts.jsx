import { Link } from 'react-router';
import { formatRupees } from '../../../formatting.js';
import { lastSevenDays, weekChange, weekdayOf } from './dashboardDates.js';

function ChangeNote({ change }) {
  if (change === null) return null;
  return <> · <span className={change >= 0 ? 'change-up' : 'change-down'}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span> on the week before</>;
}

function SalesBars({ days, today }) {
  const highest = Math.max(...days.map((day) => day.sales), 1);
  return (
    <>
      <div className="sales-bars">
        {days.map((day) => (
          <div key={day.date} className={`sales-bar${day.date === today ? ' sales-bar-today' : ''}`} aria-label={`${weekdayOf(day.date)}: ${formatRupees(day.sales)} from ${day.orders} orders`}>
            <b>{day.sales > 0 ? formatRupees(day.sales) : ''}</b>
            <span style={{ height: `${Math.max((day.sales / highest) * 82, day.sales > 0 ? 2 : 0)}%` }} />
          </div>
        ))}
      </div>
      <div className="sales-days">
        {days.map((day) => <span key={day.date}>{day.date === today ? 'Today' : weekdayOf(day.date)}<small>{day.orders} {day.orders === 1 ? 'order' : 'orders'}</small></span>)}
      </div>
    </>
  );
}

// Sales for each of the last 7 days; today's bar is dark green.
export function SalesWeekChart({ salesWeek, salesWeekBefore, today }) {
  return (
    <section className="card dashboard-panel">
      <div className="card-heading panel-heading">
        <div>
          <h2>Sales · last 7 days</h2>
          <p className="chart-total"><strong>{formatRupees(salesWeek.sales)}</strong>
            <small>{salesWeek.deliveredOrders} {salesWeek.deliveredOrders === 1 ? 'order' : 'orders'} delivered<ChangeNote change={weekChange(salesWeek.sales, salesWeekBefore)} /></small>
          </p>
        </div>
        <Link to="/admin/reports" className="text-button">Reports</Link>
      </div>
      {salesWeek.deliveredOrders === 0
        ? <p className="hint panel-empty">No deliveries in the last 7 days.</p>
        : <SalesBars days={lastSevenDays(salesWeek.byDay, today)} today={today} />}
    </section>
  );
}

// UPI and cash split, then one bar per zone.
export function SalesSources({ salesWeek }) {
  const upiPercent = salesWeek.sales > 0 ? (salesWeek.upiSales / salesWeek.sales) * 100 : 0;
  const highest = salesWeek.byZone[0]?.sales ?? 1;
  return (
    <section className="card dashboard-panel">
      <div className="card-heading panel-heading"><h2>Where sales came from</h2></div>
      {salesWeek.sales === 0 ? <p className="hint panel-empty">No deliveries in the last 7 days.</p> : (
        <div className="panel-body">
          <div className="money-split" aria-hidden="true"><i style={{ width: `${upiPercent}%` }} /><i /></div>
          <div className="money-legend">
            <span><i className="legend-upi" />UPI <b>{formatRupees(salesWeek.upiSales)}</b></span>
            <span><i className="legend-cash" />Cash <b>{formatRupees(salesWeek.cashSales)}</b></span>
          </div>
          <div className="zone-sales">
            {salesWeek.byZone.map((zone) => (
              <div key={zone.zoneName} className="zone-sale">
                <span>{zone.zoneName}</span><b>{formatRupees(zone.sales)}</b>
                <div className="zone-sale-track"><i style={{ width: `${(zone.sales / highest) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
