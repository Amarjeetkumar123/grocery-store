// The server stores a cutoff as "minutes before the slot starts". The owner
// thinks of it as a time on a day: "10 PM, day before" for a 7 AM slot = 540.
import { formatTime } from '../../../formatting.js';

const minutesInDay = 24 * 60;

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

// 540 before "07:00" -> { daysBefore: 1, time: "22:00" }
export function toCutoffChoice(startTime, cutoffMinutesBefore) {
  const cutoffInStartDay = toMinutes(startTime) - cutoffMinutesBefore;
  const daysBefore = cutoffInStartDay < 0 ? Math.ceil(-cutoffInStartDay / minutesInDay) : 0;
  return { daysBefore, time: toTime(cutoffInStartDay + daysBefore * minutesInDay) };
}

// Returns minutes, or null when the cutoff would be after the slot starts.
export function toCutoffMinutesBefore(startTime, { daysBefore, time }) {
  const minutesBefore = toMinutes(startTime) - toMinutes(time) + daysBefore * minutesInDay;
  return minutesBefore >= 0 ? minutesBefore : null;
}

const dayNames = ['same day', 'day before', '2 days before', '3 days before'];

// "10 PM, day before"
export function describeCutoff(startTime, cutoffMinutesBefore) {
  const { daysBefore, time } = toCutoffChoice(startTime, cutoffMinutesBefore);
  return `${formatTime(time)}, ${dayNames[daysBefore] ?? `${daysBefore} days before`}`;
}
