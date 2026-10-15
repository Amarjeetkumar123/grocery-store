import { addDays } from '../../../formatting.js';

const atNoon = (isoDate) => new Date(`${isoDate}T12:00:00Z`);

// "2026-10-15" -> "Wed"; "Wednesday, 15 October" for the page subtitle.
export const weekdayOf = (isoDate) => atNoon(isoDate).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
export const longDateOf = (isoDate) => atNoon(isoDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

// All 7 days up to today, so a day without sales shows as an empty bar.
export function lastSevenDays(byDay, today) {
  return [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => addDays(today, -daysAgo))
    .map((date) => byDay.find((day) => day.date === date) ?? { date, sales: 0, orders: 0 });
}

// Whole-number % change on the week before, or null when there is nothing to compare with.
export function weekChange(sales, salesWeekBefore) {
  return salesWeekBefore > 0 ? Math.round(((sales - salesWeekBefore) / salesWeekBefore) * 100) : null;
}

// Tomorrow's slot rows grouped by zone, keeping the server's order.
export function groupSlotsByZone(slots) {
  const zones = new Map();
  for (const slot of slots) {
    if (!zones.has(slot.zoneId)) zones.set(slot.zoneId, { zoneId: slot.zoneId, zoneName: slot.zoneName, zoneType: slot.zoneType, slots: [] });
    if (slot.slotId) zones.get(slot.zoneId).slots.push(slot);
  }
  return [...zones.values()];
}
