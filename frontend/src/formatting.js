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
