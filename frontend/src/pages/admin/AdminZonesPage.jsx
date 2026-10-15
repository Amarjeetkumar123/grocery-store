import { useState } from 'react';
import { useApiData } from '../../useApiData.js';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';
import { ZoneList } from './zones/ZoneList.jsx';
import { ZoneForm } from './zones/ZoneForm.jsx';
import { TowerEditor } from './zones/TowerEditor.jsx';
import { SlotTable } from './zones/SlotTable.jsx';

// Cancel throws away unsaved edits by starting the form again from the saved zone.
function ZoneDetails({ zone, onZoneSaved, reload }) {
  const [formVersion, setFormVersion] = useState(0);
  return (
    <>
      <ZoneForm key={`${zone.id}-${formVersion}`} zone={zone} onSaved={onZoneSaved} onCancel={() => setFormVersion(formVersion + 1)}>
        {zone.type === 'society' && <TowerEditor zone={zone} onChanged={reload} />}
      </ZoneForm>
      <SlotTable key={zone.id} zone={zone} onChanged={reload} />
    </>
  );
}

function zonesSubtitle(zones) {
  const societies = zones.filter((zone) => zone.type === 'society').length;
  const localAreas = zones.length - societies;
  return `${zones.length} delivery ${zones.length === 1 ? 'zone' : 'zones'} · ${societies} ${societies === 1 ? 'society' : 'societies'} and ${localAreas} ${localAreas === 1 ? 'local area' : 'local areas'}`;
}

// selectedZoneId: a zone id, 'new' while adding a zone, or null for the first zone.
// The zone list and the editor each scroll on their own and the page fits the window.
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
    <div className="fit-screen-page">
      <AdminPageHeader title="Zones & slots" subtitle={data ? zonesSubtitle(zones) : null} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="zones-layout">
          <ZoneList zones={zones} selectedZoneId={zone?.id} onSelect={setSelectedZoneId} onAddZone={() => setSelectedZoneId('new')} />
          <div className="zone-details">
            {selectedZoneId === 'new'
              ? <ZoneForm zone={null} onSaved={showSavedZone} onCancel={() => setSelectedZoneId(null)} />
              : zone && <ZoneDetails zone={zone} onZoneSaved={showSavedZone} reload={reload} />}
          </div>
        </div>
      )}
    </div>
  );
}
