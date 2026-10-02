import { useState } from 'react';
import { formatCutoff, formatDeliveryDay, formatTimeRange } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';

const slotsShownAtFirst = 4;

export const slotKeyOf = (slot) => `${slot.slotId}|${slot.deliveryDate}`;

function SlotOption({ slot, chosen, onChoose }) {
  const full = slot.placesLeft === 0;
  return (
    <label className={`slot-option${chosen ? ' slot-option-chosen' : ''}${full ? ' slot-option-full' : ''}`}>
      <input type="radio" name="deliverySlot" checked={chosen} disabled={full} onChange={() => onChoose(slotKeyOf(slot))} />
      <span className="slot-option-name">{formatDeliveryDay(slot.deliveryDate)}, {formatTimeRange(slot.startTime, slot.endTime)}</span>
      <span className={`pill ${full ? 'pill-gray' : 'pill-green'}`}>{full ? 'Full' : `${slot.placesLeft} left`}</span>
    </label>
  );
}

// slots: open delivery slots for the customer's zone (from /api/checkout/slots).
export function SlotPicker({ slotsRequest, chosenSlot, onChoose }) {
  const [showAll, setShowAll] = useState(false);
  const slots = slotsRequest.data?.slots ?? [];
  const chosenIndex = slots.indexOf(chosenSlot);
  const visibleSlots = showAll ? slots : slots.slice(0, Math.max(slotsShownAtFirst, chosenIndex + 1));
  return (
    <section className="card slot-picker">
      <div className="card-heading">
        <h2>Delivery slot</h2>
        {chosenSlot && <span className="hint with-icon"><Icon name="clock" size={16} /> Order by {formatCutoff(chosenSlot.cutoffAt)}</span>}
      </div>
      <LoadingOrError loading={slotsRequest.loading} error={slotsRequest.error} onRetry={slotsRequest.reload} />
      {slotsRequest.data && slots.length === 0 && (
        <p className="hint">No delivery slots are open for your area right now. Please check again later.</p>
      )}
      <div className="slot-options" role="radiogroup" aria-label="Delivery slot">
        {visibleSlots.map((slot) => (
          <SlotOption key={slotKeyOf(slot)} slot={slot} chosen={chosenSlot === slot} onChoose={onChoose} />
        ))}
      </div>
      {visibleSlots.length < slots.length && (
        <button type="button" className="text-button" onClick={() => setShowAll(true)}>Show {slots.length - visibleSlots.length} more slots</button>
      )}
    </section>
  );
}
