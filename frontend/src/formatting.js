const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 1050 -> "₹1,050", 155.5 -> "₹155.5"
export function formatRupees(amount) {
  return rupeeFormatter.format(amount);
}

// Whole-number discount, e.g. MRP 1050, price 899 -> 14. 0 when no discount.
export function percentOff(maximumRetailPrice, price) {
  if (!maximumRetailPrice || price >= maximumRetailPrice) return 0;
  return Math.floor(((maximumRetailPrice - price) / maximumRetailPrice) * 100);
}

// "Green Valley · Tower B · 1204" or "42, Gali No. 3 · Sector 73"
export function deliveryAddressLine(profile) {
  if (profile.zoneType === 'society') return `${profile.zoneName} · ${profile.towerName} · ${profile.flatNumber}`;
  return `${profile.houseNumber}, ${profile.street} · ${profile.zoneName}`;
}

// "2027-03-31" -> "Mar 2027"
export function formatMonthYear(isoDate) {
  if (!isoDate) return '';
  const [year, month] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const indianDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

// Today's date in India as "2026-10-03".
export function todayInIndia() {
  return indianDateFormatter.format(new Date());
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// "2026-10-04" -> "Today", "Tomorrow" or "Sat 4 Oct"
export function formatDeliveryDay(isoDate) {
  const today = todayInIndia();
  if (isoDate === today) return 'Today';
  if (isoDate === addDays(today, 1)) return 'Tomorrow';
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  }).replace(',', '');
}

function splitTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const hour = hours % 12 || 12;
  return { clock: minutes ? `${hour}:${String(minutes).padStart(2, '0')}` : String(hour), meridiem: hours < 12 ? 'AM' : 'PM' };
}

// "07:00" -> "7 AM", "18:30" -> "6:30 PM"
export function formatTime(time) {
  const { clock, meridiem } = splitTime(time);
  return `${clock} ${meridiem}`;
}

// ("07:00", "09:00") -> "7–9 AM"; ("11:00", "13:00") -> "11 AM–1 PM"
export function formatTimeRange(startTime, endTime) {
  const start = splitTime(startTime);
  const end = splitTime(endTime);
  if (start.meridiem === end.meridiem) return `${start.clock}–${end.clock} ${end.meridiem}`;
  return `${start.clock} ${start.meridiem}–${end.clock} ${end.meridiem}`;
}

// When a slot stops taking orders: "10 PM today", "2 PM tomorrow".
export function formatCutoff(cutoffAt) {
  const moment = new Date(cutoffAt);
  const time = moment.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
    .replace(':00', '').toUpperCase();
  return `${time} ${formatDeliveryDay(indianDateFormatter.format(moment)).toLowerCase()}`;
}

// "2026-09-28T10:20:00Z" -> "28 Sep"
export function formatShortDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

// "just now", "9 min ago", "3 h ago", or the date for older times.
export function formatTimeAgo(isoTimestamp) {
  const minutes = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatShortDate(isoTimestamp);
}
