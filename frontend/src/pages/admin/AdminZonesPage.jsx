import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { ZoneList } from './zones/ZoneList.jsx';
import { ZoneForm } from './zones/ZoneForm.jsx';
import { TowerEditor } from './zones/TowerEditor.jsx';
import { SlotTable } from './zones/SlotTable.jsx';

function ZoneDetails({ zone, onZoneSaved, reload }) {
  return (
    <div className="zone-details">
      <section className="card form-section">
        <div className="card-heading">
          <h2>{zone.name}</h2>
          <span className="badge-cell">
            <span className="pill pill-blue">{zone.type === 'society' ? 'Society' : 'Local area'}</span>
            <span className={`pill ${zone.active ? 'pill-green' : 'pill-gray'}`}>{zone.active ? 'Live' : 'Off'}</span>
          </span>
        </div>
        <ZoneForm key={zone.id} zone={zone} onSaved={onZoneSaved} />
        {zone.type === 'society' && <TowerEditor zone={zone} onChanged={reload} />}
      </section>
      <SlotTable key={zone.id} zone={zone} onChanged={reload} />
    </div>
  );
}

// selectedZoneId: a zone id, 'new' while adding a zone, or null for the first zone.
export function AdminZonesPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/zones');
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const zones = data?.zones ?? [];
  const zone = zones.find((candidate) => candidate.id === selectedZoneId) ?? (selectedZoneId === 'new' ? null : zones[0]);

  async function showSavedZone(zoneId) {
    await reload();
    setSelectedZoneId(zoneId);
  }

  return (
    <>
      <AdminPageHeader title="Zones & slots" />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="zones-layout">
          <ZoneList zones={zones} selectedZoneId={zone?.id} onSelect={setSelectedZoneId} onAddZone={() => setSelectedZoneId('new')} />
          {selectedZoneId === 'new' ? (
            <section className="card form-section zone-details">
              <h2>New zone</h2>
              <ZoneForm zone={null} onSaved={showSavedZone} />
            </section>
          ) : zone && <ZoneDetails zone={zone} onZoneSaved={showSavedZone} reload={reload} />}
        </div>
      )}
    </>
  );
}
