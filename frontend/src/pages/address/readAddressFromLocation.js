// Turns the phone's location into address parts, using OpenStreetMap's free
// address lookup (no key needed; fair use is one lookup per tap, which is what we do).
const lookupAddress = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en';

export async function readAddressFromLocation({ latitude, longitude }) {
  const response = await fetch(`${lookupAddress}&lat=${latitude}&lon=${longitude}`);
  if (!response.ok) throw new Error('Address lookup failed.');
  return addressPartsOf((await response.json()).address ?? {});
}

// Map data is patchy (a road can be called just "g"), so very short names are ignored.
const usableName = (text) => (typeof text === 'string' && text.trim().length >= 3 ? text.trim() : '');

// OpenStreetMap address -> { houseNumber, street, landmark, placeNames } (missing parts are '').
export function addressPartsOf(address) {
  const nearby = [address.amenity, address.shop, address.building, address.neighbourhood, address.suburb].map(usableName).find(Boolean);
  const placeNames = [address.building, address.residential, address.neighbourhood, address.quarter, address.suburb, address.city_district, address.road];
  return {
    houseNumber: address.house_number?.trim() ?? '',
    street: [address.road, address.pedestrian, address.residential].map(usableName).find(Boolean) ?? '',
    landmark: nearby ? `Near ${nearby}` : '',
    placeNames: placeNames.map(usableName).filter((name) => name.length >= 4),
  };
}

const wordsOf = (text) => ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

// The zone that shares a whole place name with the address, ignoring case:
// "Sector 73" from the map matches the zone "Sector 73 Market Area", but "Sector 7" does not.
export function matchZone(zones, placeNames) {
  const names = placeNames.map(wordsOf);
  return zones.find((zone) => {
    const zoneName = wordsOf(zone.name);
    return names.some((name) => zoneName.includes(name) || name.includes(zoneName));
  }) ?? null;
}

// Fills only the boxes the customer has left empty, so typed text is never replaced.
// The values the location suggests for each box.
export function suggestedValuesOf(parts, zone) {
  return { zoneId: zone ? String(zone.id) : '', houseNumber: parts.houseNumber, street: parts.street, landmark: parts.landmark };
}

export function fillEmptyFields(formValues, parts, zone) {
  const suggested = Object.entries(suggestedValuesOf(parts, zone));
  return { ...formValues, ...Object.fromEntries(suggested.map(([fieldName, value]) => [fieldName, formValues[fieldName] || value])) };
}

// Boxes still holding what the location filled in; a box drops out once the customer changes it.
export function fieldsFromLocation(formValues, suggestedValues) {
  return new Set(Object.keys(suggestedValues).filter((fieldName) => suggestedValues[fieldName] && formValues[fieldName] === suggestedValues[fieldName]));
}
