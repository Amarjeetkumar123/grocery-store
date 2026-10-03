import { Icon } from '../../../Icon.jsx';

// Date fields (children), zone, time window and (optionally) search, shared by the board and both lists.
// zoneOptions / timeOptions: [{ value, label }].
export function BoardFilters({ filters, setFilter, zoneOptions, timeOptions, showSearch = true, children }) {
  return (
    <div className="filter-row board-filters">
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
      {showSearch && (
        <input type="search" className="input admin-search" placeholder="Order no., name, phone" aria-label="Search orders"
          value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
      )}
    </div>
  );
}

// The picking and delivery lists: one delivery day.
export function DayField({ filters, setFilter }) {
  return (
    <label className="filter-field">
      <Icon name="clock" size={18} /> Delivery
      <input type="date" className="input input-small" value={filters.date} onChange={(event) => setFilter('date', event.target.value)} required />
    </label>
  );
}

// The board: a delivery date range. Clearing both shows every order.
export function DateRangeFields({ filters, setFilter, setFilters }) {
  return (
    <>
      <label className="filter-field">
        <Icon name="clock" size={18} /> From
        <input type="date" className="input input-small" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilter('from', event.target.value)} />
      </label>
      <label className="filter-field">
        To
        <input type="date" className="input input-small" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilter('to', event.target.value)} />
      </label>
      {(filters.from || filters.to) && <button type="button" className="text-button" onClick={() => setFilters({ from: '', to: '' })}>All dates</button>}
    </>
  );
}
