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
      <span className="zone-icon"><Icon name={zone.type === 'society' ? 'building' : 'home'} /></span>
      <span className="zone-button-text">
        <strong>{zone.name}</strong>
        <span className="hint">{zoneSummary(zone)}</span>
      </span>
      <span className={`pill ${zone.active ? 'pill-green' : 'pill-gray'}`}>{zone.active ? 'Live' : 'Off'}</span>
    </button>
  );
}

export function ZoneList({ zones, selectedZoneId, onSelect, onAddZone }) {
  const [filter, setFilter] = useState('all');
  const countOf = (type) => (type === 'all' ? zones.length : zones.filter((zone) => zone.type === type).length);
  const visibleZones = zones.filter((zone) => filter === 'all' || zone.type === filter);
  return (
    <section className="card zone-list">
      <div className="card-heading">
        <h2>Delivery zones · {zones.length}</h2>
        <button type="button" className="button button-compact" onClick={onAddZone}><Icon name="plus" /> Add zone</button>
      </div>
      <div className="chip-row" role="group" aria-label="Show">
        {filters.map(({ type, label }) => (
          <button key={type} type="button" className="chip" aria-pressed={filter === type} onClick={() => setFilter(type)}>
            {label}{type !== 'all' && ` · ${countOf(type)}`}
          </button>
        ))}
      </div>
      {visibleZones.map((zone) => (
        <ZoneButton key={zone.id} zone={zone} selected={zone.id === selectedZoneId} onSelect={onSelect} />
      ))}
    </section>
  );
}
