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

function ZoneHeading({ zone, formId, saving, onCancel }) {
  return (
    <div className="card-heading zone-heading">
      <div className="zone-title">
        <h2>{zone ? zone.name : 'New zone'}</h2>
        {zone && <span className="pill pill-blue">{zone.type === 'society' ? 'Society' : 'Local area'}</span>}
        {zone && <span className={`pill ${zone.active ? 'pill-green' : 'pill-gray'}`}>{zone.active ? 'Live' : 'Not live'}</span>}
      </div>
      <div className="row-actions">
        <button type="button" className="button button-compact button-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" form={formId} className="button button-compact" disabled={saving}>{saving ? 'Saving…' : zone ? 'Save changes' : 'Add zone'}</button>
      </div>
    </div>
  );
}

function MoneyFields({ values, update, fieldErrors }) {
  return (
    <div className="field-row money-fields">
      <TextField fieldId="minimumOrderValue" label="Minimum order" prefix="₹" inputMode="decimal" value={values.minimumOrderValue}
        onChange={update('minimumOrderValue')} errorMessage={fieldErrors.minimumOrderValue} />
      <TextField fieldId="deliveryCharge" label="Delivery charge" prefix="₹" inputMode="decimal" value={values.deliveryCharge}
        onChange={update('deliveryCharge')} errorMessage={fieldErrors.deliveryCharge} />
      <TextField fieldId="freeDeliveryAbove" label="Free delivery above" prefix="₹" inputMode="decimal" placeholder="Never" value={values.freeDeliveryAbove}
        onChange={update('freeDeliveryAbove')} errorMessage={fieldErrors.freeDeliveryAbove} />
    </div>
  );
}

// zone: the zone to edit, or null to add one. Save sits in the heading, next to the name.
// children (the tower editor) go under the form, outside it, because they have their own form.
export function ZoneForm({ zone, onSaved, onCancel, children }) {
  const [values, setValues] = useState(() => toFormValues(zone));
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const formId = `zone-form-${zone?.id ?? 'new'}`;

  async function handleSubmit(event) {
    event.preventDefault();
    const request = zone
      ? () => callApi(`/api/admin/zones/${zone.id}`, { method: 'PUT', body: values })
      : () => callApi('/api/admin/zones', { method: 'POST', body: values });
    const result = await save(request);
    if (result) onSaved(result.zoneId);
  }

  return (
    <section className="card zone-card">
      <ZoneHeading zone={zone} formId={formId} saving={saving} onCancel={onCancel} />
      <form id={formId} className="zone-form" onSubmit={handleSubmit}>
        <p className="section-label">Details</p>
        <TextField fieldId="zoneName" label="Society or area name" value={values.name} onChange={update('name')} errorMessage={fieldErrors.name} maxLength={80} />
        {!zone && <ZoneTypeChoice value={values.type} onChange={update('type')} />}
        <MoneyFields values={values} update={update} fieldErrors={fieldErrors} />
        {error && <p className="error-text" role="alert">{error}</p>}
        <label className="switch-row">
          <span><strong>Live</strong><small>Customers can choose this zone and place orders</small></span>
          <input type="checkbox" className="switch" role="switch" checked={values.active} onChange={(event) => update('active')(event.target.checked)} />
        </label>
      </form>
      {children}
    </section>
  );
}
