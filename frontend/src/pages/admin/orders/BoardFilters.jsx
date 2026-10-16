import { addDays, todayInIndia } from '../../../formatting.js';
import { Icon } from '../../../Icon.jsx';

// One-tap delivery date ranges: days from today, or none for all dates.
const datePresets = [
  { label: 'Yesterday', from: -1, to: -1 },
  { label: 'Today', from: 0, to: 0 },
  { label: 'Tomorrow', from: 1, to: 1 },
  { label: 'Next 7 days', from: 0, to: 6 },
  { label: 'All dates' },
];

function presetRange(preset, today) {
  if (preset.from === undefined) return { from: '', to: '' };
  return { from: addDays(today, preset.from), to: addDays(today, preset.to) };
}

function DatePresets({ filters, setFilters }) {
  const today = todayInIndia();
  return (
    <div className="segmented date-presets" role="group" aria-label="Delivery dates">
      {datePresets.map((preset) => {
        const range = presetRange(preset, today);
        const pressed = range.from === filters.from && range.to === filters.to;
        return <button key={preset.label} type="button" aria-pressed={pressed} onClick={() => setFilters(range)}>{preset.label}</button>;
      })}
    </div>
  );
}

// Date fields (children), zone, time window and (optionally) search, shared by the board and both lists.
// zoneOptions / timeOptions: [{ value, label }].
export function BoardFilters({ filters, setFilter, zoneOptions, timeOptions, showSearch = true, children }) {
  return (
    <div className="filter-row board-filters">
      {showSearch && (
        <input type="search" className="input admin-search" placeholder="Order no., name or phone" aria-label="Search orders"
          value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
      )}
      {children}
      <label className="filter-field">
        <Icon name="pin" size={18} /> Zone
        <select className="input input-small" value={filters.zoneId} onChange={(event) => setFilter('zone', event.target.value)}>
          <option value="">All zones</option>
          {zoneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="filter-field">
        Slot
        <select className="input input-small" value={filters.time} onChange={(event) => setFilter('time', event.target.value)}>
          <option value="">All slots</option>
          {timeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
  );
}

// A delivery date range, with one-tap presets. Clearing both shows every order.
export function DateRangeFields({ filters, setFilter, setFilters }) {
  return (
    <>
      <DatePresets filters={filters} setFilters={setFilters} />
      <label className="filter-field">
        <Icon name="clock" size={18} /> From
        <input type="date" className="input input-small" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilter('from', event.target.value)} />
      </label>
      <label className="filter-field">
        To
        <input type="date" className="input input-small" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilter('to', event.target.value)} />
      </label>
    </>
  );
}
