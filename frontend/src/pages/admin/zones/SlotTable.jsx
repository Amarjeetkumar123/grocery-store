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

// Time and "Order by" share one column, so the table fits without scrolling sideways.
function SlotRow({ slot, onEdit }) {
  return (
    <tr>
      <td>{slot.name}</td>
      <td><DayDots days={slot.days} /></td>
      <td><div className="two-line"><span>{formatTimeRange(slot.startTime, slot.endTime)}</span><small className="wrap">Order by {describeCutoff(slot.startTime, slot.cutoffMinutesBefore)}</small></div></td>
      <td className="number">{slot.maximumOrders}</td>
      <td>{slot.active ? <span className="status-dot">Live</span> : <span className="status-dot status-dot-off">Paused</span>}</td>
      <td className="number"><button type="button" className="icon-button" onClick={() => onEdit(slot.id)} aria-label={`Edit ${slot.name}`}><Icon name="edit" /></button></td>
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
        <h2>Delivery slots <span className="heading-count">{zone.slots.length}</span></h2>
        <button type="button" className="button button-compact button-outline" onClick={() => setEditingSlotId('new')}><Icon name="plus" /> Add slot</button>
      </div>
      {editingSlotId !== null && (
        <SlotForm key={editingSlotId} zoneId={zone.id} slot={editingSlot} onSaved={finishEditing} onCancel={() => setEditingSlotId(null)} />
      )}
      <table className="admin-table slot-table">
        <thead><tr><th>Slot</th><th>Days</th><th>Time</th><th className="number">Max</th><th>Status</th><th /></tr></thead>
        <tbody>
          {zone.slots.map((slot) => <SlotRow key={slot.id} slot={slot} onEdit={setEditingSlotId} />)}
          {zone.slots.length === 0 && <tr><td colSpan={6} className="hint">No slots yet. Customers in this zone cannot order until you add one.</td></tr>}
        </tbody>
      </table>
      <p className="slot-tip"><Icon name="clock" size={15} /> Give a nearby local area the same time window, so one rider covers both in one round.</p>
    </section>
  );
}
