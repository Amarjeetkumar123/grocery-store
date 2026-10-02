import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { TextField } from '../../../FormFields.jsx';
import { Icon } from '../../../Icon.jsx';

const blankZone = { name: '', type: 'society', active: true, minimumOrderValue: '0', deliveryCharge: '0', freeDeliveryAbove: '' };

function toFormValues(zone) {
  if (!zone) return blankZone;
  return {
    name: zone.name,
    type: zone.type,
    active: zone.active,
    minimumOrderValue: String(zone.minimumOrderValue),
    deliveryCharge: String(zone.deliveryCharge),
    freeDeliveryAbove: zone.freeDeliveryAbove === null ? '' : String(zone.freeDeliveryAbove),
  };
}

function ZoneTypeChoice({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Zone type">
      <button type="button" aria-pressed={value === 'society'} onClick={() => onChange('society')}><Icon name="building" size={16} /> Society</button>
      <button type="button" aria-pressed={value === 'locality'} onClick={() => onChange('locality')}><Icon name="home" size={16} /> Local area</button>
    </div>
  );
}

// zone: the zone to edit, or null to add a new one. onSaved(zoneId).
export function ZoneForm({ zone, onSaved }) {
  const [values, setValues] = useState(() => toFormValues(zone));
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const request = zone
      ? () => callApi(`/api/admin/zones/${zone.id}`, { method: 'PUT', body: values })
      : () => callApi('/api/admin/zones', { method: 'POST', body: values });
    const result = await save(request);
    if (result) onSaved(result.zoneId);
  }

  return (
    <form className="zone-form" onSubmit={handleSubmit}>
      <TextField fieldId="zoneName" label="Society or area name" value={values.name} onChange={update('name')} errorMessage={fieldErrors.name} maxLength={80} />
      {!zone && <ZoneTypeChoice value={values.type} onChange={update('type')} />}
      <div className="field-row">
        <TextField fieldId="minimumOrderValue" label="Minimum order (₹)" inputMode="decimal" value={values.minimumOrderValue}
          onChange={update('minimumOrderValue')} errorMessage={fieldErrors.minimumOrderValue} />
        <TextField fieldId="deliveryCharge" label="Delivery charge (₹)" inputMode="decimal" value={values.deliveryCharge}
          onChange={update('deliveryCharge')} errorMessage={fieldErrors.deliveryCharge} />
        <TextField fieldId="freeDeliveryAbove" label="Free delivery above (₹)" inputMode="decimal" placeholder="Never" value={values.freeDeliveryAbove}
          onChange={update('freeDeliveryAbove')} errorMessage={fieldErrors.freeDeliveryAbove} />
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={values.active} onChange={(event) => update('active')(event.target.checked)} />
        Live: customers can choose this zone and order
      </label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="button button-compact" disabled={saving}>{saving ? 'Saving…' : zone ? 'Save zone' : 'Add zone'}</button>
      </div>
    </form>
  );
}
