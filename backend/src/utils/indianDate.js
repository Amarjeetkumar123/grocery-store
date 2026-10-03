const indianDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

// Today's date in India as "2026-10-03", whatever the server's own time zone.
export function todayInIndia() {
  return indianDateFormatter.format(new Date());
}
