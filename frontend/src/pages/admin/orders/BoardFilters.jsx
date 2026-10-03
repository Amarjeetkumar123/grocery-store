import { Icon } from '../../../Icon.jsx';
import { timeOptionsOf, zoneOptionsOf } from './orderBoardData.js';

// Day, zone, time window and (optionally) search, shared by the board and both lists.
export function BoardFilters({ orders, filters, setFilter, showSearch = true }) {
  return (
    <div className="filter-row board-filters">
      <label className="filter-field">
        <Icon name="clock" size={18} /> Delivery
        <input type="date" className="input input-small" value={filters.date} onChange={(event) => setFilter('date', event.target.value)} required />
      </label>
      <label className="filter-field">
        <Icon name="pin" size={18} /> Zone
        <select className="input input-small" value={filters.zoneId} onChange={(event) => setFilter('zone', event.target.value)}>
          <option value="">All zones</option>
          {zoneOptionsOf(orders).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="filter-field">
        Slot
        <select className="input input-small" value={filters.time} onChange={(event) => setFilter('time', event.target.value)}>
          <option value="">All slots</option>
          {timeOptionsOf(orders).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {showSearch && (
        <input type="search" className="input admin-search" placeholder="Order no., name, phone" aria-label="Search orders"
          value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
      )}
    </div>
  );
}
