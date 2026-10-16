import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { Icon } from '../../../Icon.jsx';
import { useDialog } from '../../../components/DialogProvider.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';

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
    <form className="tower-add" onSubmit={addTower}>
      <input className="input input-small" value={newTowerName} onChange={(event) => setNewTowerName(event.target.value)}
        placeholder="e.g. Tower E" maxLength={40} aria-label="New tower name" />
      <button type="submit" className="button button-compact button-outline" disabled={saving || !newTowerName.trim()}>
        <Icon name="plus" /> Add
      </button>
    </form>
  );
}

// Towers or blocks of a society. A tower someone lives in cannot be removed.
export function TowerEditor({ zone, onChanged }) {
  const { saving, error, save } = useSaveRequest();
  const dialog = useDialog();
  const showToast = useToast();
  async function removeTower(tower) {
    const confirmed = await dialog.confirm({
      title: `Remove ${tower.name}?`, message: `Customers in ${zone.name} will no longer be able to pick it.`,
      confirmLabel: 'Remove', tone: 'danger',
    });
    if (!confirmed || !(await save(() => callApi(`/api/admin/towers/${tower.id}`, { method: 'DELETE' })))) return;
    showToast(`${tower.name} removed`);
    onChanged();
  }
  return (
    <div className="tower-editor">
      <p className="section-label">Towers / blocks <span className="heading-count">{zone.towers.length}</span></p>
      <p className="field-hint">{zone.towers.length === 0 ? 'No towers yet. Customers need one to save their address.' : 'Customers pick one of these when they save their address.'}</p>
      <div className="tower-chips">
        {zone.towers.map((tower) => (
          <span key={tower.id} className="tower-chip">
            {tower.name}
            <button type="button" className="tower-remove" onClick={() => removeTower(tower)} aria-label={`Remove ${tower.name}`}>
              <Icon name="close" size={13} />
            </button>
          </span>
        ))}
        <AddTowerForm zone={zone} save={save} saving={saving} onChanged={onChanged} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
