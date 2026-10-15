import { useState } from 'react';
import { Icon } from '../../../Icon.jsx';

const filters = [
  { type: 'all', label: 'All' },
  { type: 'society', label: 'Societies' },
  { type: 'locality', label: 'Local areas' },
];

function zoneSummary(zone) {
  const customers = `${zone.customerCount} ${zone.customerCount === 1 ? 'customer' : 'customers'}`;
  if (zone.type === 'locality') return `Local area · ${customers}`;
  return `Society · ${zone.towers.length} ${zone.towers.length === 1 ? 'tower' : 'towers'} · ${customers}`;
}

function ZoneButton({ zone, selected, onSelect }) {
  return (
    <button type="button" className={`zone-button${selected ? ' zone-button-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(zone.id)}>
      <span className={`zone-icon${zone.type === 'locality' ? ' zone-icon-local' : ''}`}><Icon name={zone.type === 'society' ? 'building' : 'home'} size={16} /></span>
      <span className="zone-button-text">
        <strong>{zone.name}</strong>
        <small>{zoneSummary(zone)}</small>
      </span>
      <span className={`live-dot${zone.active ? '' : ' live-dot-off'}`} title={zone.active ? 'Live' : 'Not live'} />
    </button>
  );
}

const matches = (zone, filter, searchText) =>
  (filter === 'all' || zone.type === filter) && zone.name.toLowerCase().includes(searchText.trim().toLowerCase());

// The list scrolls inside its card, so many zones never push the editor down.
export function ZoneList({ zones, selectedZoneId, onSelect, onAddZone }) {
  const [filter, setFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const countOf = (type) => (type === 'all' ? zones.length : zones.filter((zone) => zone.type === type).length);
  const visibleZones = zones.filter((zone) => matches(zone, filter, searchText));
  const notLive = zones.filter((zone) => !zone.active).length;
  return (
    <section className="card zone-list">
      <div className="card-heading zone-list-heading">
        <h2>Delivery zones <span className="heading-count">{zones.length}</span></h2>
        <button type="button" className="button button-compact" onClick={onAddZone}><Icon name="plus" /> Add zone</button>
      </div>
      <label className="search-input zone-search">
        <Icon name="search" size={16} />
        <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Find a zone" aria-label="Find a zone" />
      </label>
      <div className="tab-switch" role="group" aria-label="Show">
        {filters.map(({ type, label }) => (
          <button key={type} type="button" aria-pressed={filter === type} onClick={() => setFilter(type)}>
            {label}{type !== 'all' && ` ${countOf(type)}`}
          </button>
        ))}
      </div>
      <div className="zone-buttons">
        {visibleZones.map((zone) => <ZoneButton key={zone.id} zone={zone} selected={zone.id === selectedZoneId} onSelect={onSelect} />)}
        {visibleZones.length === 0 && <p className="hint centered">No zones match.</p>}
      </div>
      {notLive > 0 && <p className="zone-list-note">{notLive} not live · shown with a grey dot</p>}
    </section>
  );
}
