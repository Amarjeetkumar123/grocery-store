// "28.5672, 77.388" as copied from Google Maps -> { latitude: '28.5672', longitude: '77.388' }; anything else -> null.
export function readCoordinatePair(text) {
  const match = text.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  if (Math.abs(Number(match[1])) > 90 || Math.abs(Number(match[2])) > 180) return null;
  return { latitude: match[1], longitude: match[2] };
}

const pasteInstead = ' On a computer, open Google Maps, right-click your shop, click the numbers at the top to copy them, and paste them into Store latitude.';

// code comes from the browser's GeolocationPositionError: 1 blocked, 2 unavailable, 3 too slow.
export function locationErrorMessage(code) {
  if (code === 1) return 'Location is blocked for this site. Click the icon left of the web address, allow Location, then try again.';
  if (code === 3) return `Finding your location took too long.${pasteInstead}`;
  return `This device could not find where it is.${pasteInstead}`;
}

export const mapLink = (latitude, longitude) => `https://www.google.com/maps?q=${latitude},${longitude}`;

// OpenStreetMap needs no key. The box is about 3.5 km across, centred on the shop, with a pin on it.
export function mapEmbedLink(latitude, longitude) {
  const box = [longitude - 0.018, latitude - 0.011, longitude + 0.018, latitude + 0.011].map((value) => value.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${latitude},${longitude}`;
}
