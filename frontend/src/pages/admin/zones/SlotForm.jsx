import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { TextField } from '../../../FormFields.jsx';
import { toCutoffChoice, toCutoffMinutesBefore } from './slotCutoff.js';

// Shown Monday first; 0 = Sunday as the server expects.
export const weekDays = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const blankSlot = { name: '', days: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '09:00', cutoffMinutesBefore: 540, maximumOrders: 25, active: true };

function toFormValues(slot) {
  const source = slot ?? blankSlot;
  return { ...source, maximumOrders: String(source.maximumOrders), cutoff: toCutoffChoice(source.startTime, source.cutoffMinutesBefore) };
}

function DayToggles({ days, onChange, errorMessage }) {
  const toggle = (day) => onChange(days.includes(day) ? days.filter((chosen) => chosen !== day) : [...days, day]);
  return (
    <div className="field">
      <span className="field-label">Days</span>
      <div className="day-toggles" role="group" aria-label="Delivery days">
        {weekDays.map(([day, letter]) => (
          <button key={day} type="button" className="day-toggle" aria-pressed={days.includes(day)} aria-label={dayFullNames[day]} onClick={() => toggle(day)}>
            {letter}
          </button>
        ))}
      </div>
      {errorMessage && <p className="field-error">{errorMessage}</p>}
    </div>
  );
}

function CutoffFields({ cutoff, onChange, errorMessage }) {
  return (
    <div className="field">
      <span className="field-label">Order cutoff</span>
      <div className="inline-form">
        <input type="time" className="input input-small" value={cutoff.time} aria-label="Cutoff time"
          onChange={(event) => onChange({ ...cutoff, time: event.target.value })} required />
        <select className="input input-small" value={cutoff.daysBefore} aria-label="Cutoff day"
          onChange={(event) => onChange({ ...cutoff, daysBefore: Number(event.target.value) })}>
          <option value={0}>same day</option>
          <option value={1}>day before</option>
          <option value={2}>2 days before</option>
        </select>
      </div>
      {errorMessage && <p className="field-error">{errorMessage}</p>}
    </div>
  );
}

function useSlotSave(zoneId, slot, values, onSaved) {
  const request = useSaveRequest();
  const [cutoffError, setCutoffError] = useState(null);
  async function saveSlot(event) {
    event.preventDefault();
    const cutoffMinutesBefore = toCutoffMinutesBefore(values.startTime, values.cutoff);
    setCutoffError(cutoffMinutesBefore === null ? 'The cutoff must be before the slot starts.' : null);
    if (cutoffMinutesBefore === null) return;
    const { cutoff, ...rest } = values;
    const body = { ...rest, cutoffMinutesBefore };
    const result = await request.save(() => (slot
      ? callApi(`/api/admin/slots/${slot.id}`, { method: 'PUT', body })
      : callApi(`/api/admin/zones/${zoneId}/slots`, { method: 'POST', body })));
    if (result) onSaved();
  }
  return { ...request, cutoffError, saveSlot };
}

// slot: the slot to edit, or null for a new one.
export function SlotForm({ zoneId, slot, onSaved, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(slot));
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const { saving, error, fieldErrors, cutoffError, saveSlot } = useSlotSave(zoneId, slot, values, onSaved);
  return (
    <form className="slot-form" onSubmit={saveSlot}>
      <div className="field-row">
        <TextField fieldId="slotName" label="Slot name" value={values.name} onChange={update('name')} placeholder="e.g. Morning" errorMessage={fieldErrors.name} maxLength={40} />
        <TextField fieldId="startTime" label="From" type="time" value={values.startTime} onChange={update('startTime')} errorMessage={fieldErrors.startTime} required />
        <TextField fieldId="endTime" label="To" type="time" value={values.endTime} onChange={update('endTime')} errorMessage={fieldErrors.endTime} required />
        <TextField fieldId="maximumOrders" label="Max orders" inputMode="numeric" value={values.maximumOrders} onChange={update('maximumOrders')} errorMessage={fieldErrors.maximumOrders} />
      </div>
      <div className="field-row">
        <DayToggles days={values.days} onChange={update('days')} errorMessage={fieldErrors.days} />
        <CutoffFields cutoff={values.cutoff} onChange={update('cutoff')} errorMessage={cutoffError ?? fieldErrors.cutoffMinutesBefore} />
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={values.active} onChange={(event) => update('active')(event.target.checked)} /> On: customers can book this slot
      </label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="text-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button button-compact" disabled={saving}>{saving ? 'Saving…' : 'Save slot'}</button>
      </div>
    </form>
  );
}
