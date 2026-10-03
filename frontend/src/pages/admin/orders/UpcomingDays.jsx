import { formatDeliveryDay } from '../../../formatting.js';

// Orders are booked up to a week ahead; one tap opens any day that has some.
export function UpcomingDays({ days, selectedDate, onSelect }) {
  if (days.length === 0) return null;
  return (
    <div className="chip-row upcoming-days" aria-label="Days with orders to deliver">
      {days.map((day) => (
        <button key={day.date} type="button" className="chip" aria-pressed={day.date === selectedDate} onClick={() => onSelect(day.date)}>
          {formatDeliveryDay(day.date)} · {day.orders} {day.orders === 1 ? 'order' : 'orders'}
        </button>
      ))}
    </div>
  );
}
