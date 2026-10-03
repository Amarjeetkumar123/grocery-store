import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { formatRupees, formatShortDate, todayInIndia } from '../../formatting.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { SalesByDayChart } from './reports/SalesByDayChart.jsx';

function shiftDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function presetRanges() {
  const today = todayInIndia();
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: shiftDays(today, -6), to: today },
    { label: 'This month', from: `${today.slice(0, 8)}01`, to: today },
    { label: 'Last 30 days', from: shiftDays(today, -29), to: today },
  ];
}

function StatTiles({ report }) {
  const tiles = [
    ['Sales', formatRupees(report.sales), `${report.deliveredOrders} orders delivered`],
    ['Cash', formatRupees(report.cashSales), 'collected at the door'],
    ['UPI', formatRupees(report.upiSales), 'straight to the bank'],
    ['Cancelled', String(report.cancelledOrders), 'orders'],
  ];
  return (
    <div className="stat-tiles">
      {tiles.map(([label, value, note]) => <div key={label} className="card stat-tile"><p className="hint">{label}</p><strong>{value}</strong><p className="hint">{note}</p></div>)}
    </div>
  );
}

function RankTable({ title, headers, rows }) {
  return (
    <section className="card report-table">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="hint">Nothing yet.</p> : (
        <table className="admin-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((cells) => <tr key={cells[0]}>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>
      )}
    </section>
  );
}

function ReportBody({ report }) {
  return (
    <>
      <StatTiles report={report} />
      {report.byDay.length > 1 && <SalesByDayChart days={report.byDay} />}
      <div className="report-columns">
        <RankTable title="By zone" headers={['Zone', 'Orders', 'Sales']}
          rows={report.byZone.map((zone) => [zone.zoneName, zone.orders, formatRupees(zone.sales)])} />
        <RankTable title="Top items" headers={['Item', 'Sold', 'Sales']}
          rows={report.topItems.map((item) => [`${item.productName} ${item.packLabel}`, item.quantity, formatRupees(item.sales)])} />
      </div>
      {report.notifyMe.map((interest) => (
        <p key={interest.categoryName} className="notice notice-warning">
          {interest.categoryName}: {interest.requests} customers tapped "Notify me".
        </p>
      ))}
    </>
  );
}

// Sales are delivered orders, counted on their delivery day.
export function AdminReportsPage() {
  const presets = presetRanges();
  const [range, setRange] = useState(presets[1]);
  const { data, error, loading, reload } = useApiData(`/api/admin/reports?from=${range.from}&to=${range.to}`);
  return (
    <>
      <AdminPageHeader title="Reports" />
      <div className="filter-row">
        {presets.map((preset) => (
          <button key={preset.label} type="button" className="chip" aria-pressed={range.label === preset.label} onClick={() => setRange(preset)}>{preset.label}</button>
        ))}
        <label className="filter-field">From <input type="date" className="input input-small" value={range.from} max={range.to}
          onChange={(event) => event.target.value && setRange({ ...range, label: null, from: event.target.value })} /></label>
        <label className="filter-field">To <input type="date" className="input input-small" value={range.to} min={range.from}
          onChange={(event) => event.target.value && setRange({ ...range, label: null, to: event.target.value })} /></label>
      </div>
      <p className="hint">{formatShortDate(`${range.from}T12:00:00Z`)} – {formatShortDate(`${range.to}T12:00:00Z`)}</p>
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && <ReportBody report={data.report} />}
    </>
  );
}
