import { Link } from 'react-router';
import { formatShortDate, formatTimeRange } from '../../../formatting.js';
import { groupSlotsByZone } from './dashboardDates.js';

const shortDay = (isoDate) => formatShortDate(`${isoDate}T12:00:00Z`);

function SlotFill({ slot }) {
  const filled = Math.min(slot.ordersTaken / slot.maximumOrders, 1);
  return <div className="fill-bar" aria-hidden="true"><span className={filled > 0.6 ? 'fill-bar-almost-full' : ''} style={{ width: `${filled * 100}%` }} /></div>;
}

function ZoneSlotRows({ zone }) {
  const zoneCell = (
    <td rowSpan={Math.max(zone.slots.length, 1)}>
      <div className="two-line"><span>{zone.zoneName}</span><small>{zone.zoneType === 'society' ? 'Society' : 'Local area'}</small></div>
    </td>
  );
  if (zone.slots.length === 0) return <tr>{zoneCell}<td colSpan={2} className="hint">No delivery tomorrow</td><td className="number">—</td></tr>;
  return zone.slots.map((slot, index) => (
    <tr key={slot.slotId}>
      {index === 0 && zoneCell}
      <td className="no-wrap">{formatTimeRange(slot.startTime, slot.endTime)}</td>
      <td><SlotFill slot={slot} /></td>
      <td className="number no-wrap">{slot.ordersTaken} / {slot.maximumOrders}</td>
    </tr>
  ));
}

// Each zone once, with its slots beside it; a slot turns amber once it is more than 60% full.
export function TomorrowSlots({ slots, tomorrow }) {
  return (
    <section className="card dashboard-panel">
      <div className="card-heading panel-heading"><h2>Tomorrow's slots</h2><span className="hint">{shortDay(tomorrow)}</span></div>
      {slots.length === 0 ? <p className="hint panel-empty">No delivery zones yet. Add them in Zones &amp; slots.</p> : (
        <table className="admin-table dashboard-slots">
          <thead><tr><th>Zone</th><th>Slot</th><th>Filled</th><th className="number">Orders</th></tr></thead>
          <tbody>{groupSlotsByZone(slots).map((zone) => <ZoneSlotRows key={zone.zoneId} zone={zone} />)}</tbody>
        </table>
      )}
    </section>
  );
}

function StockPill({ item }) {
  if (item.outOfStock) return <span className="pill pill-red">0 left</span>;
  if (item.lowStock) return <span className="pill pill-amber">{item.stock} left</span>;
  return <span className="pill pill-amber">Expiring</span>;
}

export function StockAlerts({ alerts }) {
  return (
    <section className="card dashboard-panel">
      <div className="card-heading panel-heading">
        <h2>Stock alerts {alerts.length > 0 && <span className="heading-count">{alerts.length}</span>}</h2>
        <Link to="/admin/stock" className="text-button">Open stock</Link>
      </div>
      {alerts.length === 0 ? <p className="hint panel-empty">All stock is fine.</p> : (
        <ul className="dashboard-list">
          {alerts.map((item) => (
            <li key={item.packSizeId}>
              <span>{item.productName} <small>{item.label}{!item.outOfStock && !item.lowStock && item.bestBefore && ` · expires ${shortDay(item.bestBefore)}`}</small></span>
              <StockPill item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TopItems({ items }) {
  return (
    <section className="card dashboard-panel">
      <div className="card-heading panel-heading"><h2>Top items this week</h2></div>
      {items.length === 0 ? <p className="hint panel-empty">No deliveries in the last 7 days.</p> : (
        <ul className="dashboard-list">
          {items.slice(0, 5).map((item, index) => (
            <li key={`${item.productName}-${item.packLabel}`}>
              <span><span className="list-rank">{index + 1}</span>{item.productName} <small>{item.packLabel}</small></span>
              <small>{item.quantity} sold</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
