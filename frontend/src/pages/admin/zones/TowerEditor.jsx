import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { Icon } from '../../../Icon.jsx';

function AddTowerForm({ zone, save, saving, onChanged }) {
  const [newTowerName, setNewTowerName] = useState('');
  async function addTower(event) {
    event.preventDefault();
    const result = await save(() => callApi(`/api/admin/zones/${zone.id}/towers`, { method: 'POST', body: { name: newTowerName } }));
    if (result) {
      setNewTowerName('');
      onChanged();
    }
  }
  return (
    <form className="inline-form" onSubmit={addTower}>
      <input className="input input-small" value={newTowerName} onChange={(event) => setNewTowerName(event.target.value)}
        placeholder="e.g. Tower E" maxLength={40} aria-label="New tower name" />
      <button type="submit" className="button button-compact button-outline" disabled={saving || !newTowerName.trim()}>
        <Icon name="plus" /> Add tower
      </button>
    </form>
  );
}

// Towers or blocks of a society. A tower someone lives in cannot be removed.
export function TowerEditor({ zone, onChanged }) {
  const { saving, error, save } = useSaveRequest();
  async function removeTower(tower) {
    if (!window.confirm(`Remove ${tower.name}?`)) return;
    if (await save(() => callApi(`/api/admin/towers/${tower.id}`, { method: 'DELETE' }))) onChanged();
  }
  return (
    <div className="tower-editor">
      <p className="field-label">Towers / blocks</p>
      <div className="chip-row">
        {zone.towers.map((tower) => (
          <span key={tower.id} className="chip tower-chip">
            {tower.name}
            <button type="button" className="tower-remove" onClick={() => removeTower(tower)} aria-label={`Remove ${tower.name}`}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
        {zone.towers.length === 0 && <span className="hint">No towers yet. Customers need one to save their address.</span>}
      </div>
      <AddTowerForm zone={zone} save={save} saving={saving} onChanged={onChanged} />
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
