const indianDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

// Today's date in India as "2026-10-03", whatever the server's own time zone.
export function todayInIndia() {
  return indianDateFormatter.format(new Date());
}

// "2026-10-03" plus 1 -> "2026-10-04".
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
