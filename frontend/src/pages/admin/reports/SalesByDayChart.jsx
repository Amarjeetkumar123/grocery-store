import { formatRupees, formatShortDate } from '../../../formatting.js';

// One series (sales per delivery day): one green, no legend, hover tooltip per bar.
// Days without sales are not in the data, so the gaps show as missing days.
export function SalesByDayChart({ days }) {
  const highest = Math.max(...days.map((day) => day.sales));
  const best = days.find((day) => day.sales === highest);
  return (
    <section className="card">
      <div className="card-heading">
        <h2>Sales by day</h2>
        <span className="hint">Best: {formatShortDate(`${best.date}T12:00:00Z`)} · {formatRupees(best.sales)}</span>
      </div>
      <div className="bar-chart">
        {days.map((day) => {
          const label = `${formatShortDate(`${day.date}T12:00:00Z`)}: ${formatRupees(day.sales)} from ${day.orders} orders`;
          return (
            <div key={day.date} className="bar-slot" tabIndex={0} aria-label={label}>
              <span className="bar-tooltip">{label}</span>
              <div className="bar" style={{ height: `${Math.max((day.sales / highest) * 100, 2)}%` }} />
              <span className="bar-label">{formatShortDate(`${day.date}T12:00:00Z`)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
