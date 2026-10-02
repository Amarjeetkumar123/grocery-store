import { useState } from 'react';
import { formatTimeRange } from '../../../formatting.js';
import { Icon } from '../../../Icon.jsx';
import { SlotForm, weekDays } from './SlotForm.jsx';
import { describeCutoff } from './slotCutoff.js';

function DayDots({ days }) {
  return (
    <span className="day-dots">
      {weekDays.map(([day, letter]) => <span key={day} className={days.includes(day) ? 'day-dot day-dot-on' : 'day-dot'}>{letter}</span>)}
    </span>
  );
}

function SlotRow({ slot, onEdit }) {
  return (
    <tr>
      <td><strong>{slot.name}</strong></td>
      <td><DayDots days={slot.days} /></td>
      <td>{formatTimeRange(slot.startTime, slot.endTime)}</td>
      <td>{describeCutoff(slot.startTime, slot.cutoffMinutesBefore)}</td>
      <td>{slot.maximumOrders}</td>
      <td><span className={`pill ${slot.active ? 'pill-green' : 'pill-gray'}`}>{slot.active ? 'On' : 'Off'}</span></td>
      <td><button type="button" className="icon-button" onClick={() => onEdit(slot.id)} aria-label={`Edit ${slot.name}`}><Icon name="edit" /></button></td>
    </tr>
  );
}

// editingSlotId: a slot id, 'new', or null.
export function SlotTable({ zone, onChanged }) {
  const [editingSlotId, setEditingSlotId] = useState(null);
  const editingSlot = zone.slots.find((slot) => slot.id === editingSlotId) ?? null;
  const finishEditing = () => { setEditingSlotId(null); onChanged(); };
  return (
    <section className="card slot-section">
      <div className="card-heading">
        <h2>Delivery slots</h2>
        <button type="button" className="button button-compact" onClick={() => setEditingSlotId('new')}><Icon name="plus" /> Add slot</button>
      </div>
      {editingSlotId !== null && (
        <SlotForm key={editingSlotId} zoneId={zone.id} slot={editingSlot} onSaved={finishEditing} onCancel={() => setEditingSlotId(null)} />
      )}
      <div className="table-box">
        <table className="admin-table">
          <thead><tr><th>Slot</th><th>Days</th><th>Time</th><th>Order cutoff</th><th>Max orders</th><th>Status</th><th /></tr></thead>
          <tbody>
            {zone.slots.map((slot) => <SlotRow key={slot.id} slot={slot} onEdit={setEditingSlotId} />)}
            {zone.slots.length === 0 && <tr><td colSpan={7} className="hint">No slots yet. Customers in this zone cannot order until you add one.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="notice notice-warning"><Icon name="clock" size={16} /> Tip: give a nearby local area the same time window, so one rider covers both in one round.</p>
    </section>
  );
}
