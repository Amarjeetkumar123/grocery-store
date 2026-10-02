const indianMobileNumberPattern = /^[6-9][0-9]{9}$/;

// Accepts "98765 43210", "+91 98765-43210", "09876543210" -> "9876543210".
export function normalizeIndianMobileNumber(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return indianMobileNumberPattern.test(digits) ? digits : null;
}

// Trims and collapses spaces. Returns '' for missing text, null if too long.
function cleanText(value, maximumLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned.length <= maximumLength ? cleaned : null;
}

function readRequiredText(body, fieldName, label, maximumLength, fieldErrors) {
  const cleaned = cleanText(body[fieldName], maximumLength);
  if (!cleaned) {
    fieldErrors[fieldName] = cleaned === null
      ? `${label} can be at most ${maximumLength} characters.`
      : `Please enter ${label.toLowerCase()}.`;
  }
  return cleaned || null;
}

function readOptionalText(body, fieldName, label, maximumLength, fieldErrors) {
  const cleaned = cleanText(body[fieldName], maximumLength);
  if (cleaned === null) fieldErrors[fieldName] = `${label} can be at most ${maximumLength} characters.`;
  return cleaned || null;
}

export function readPositiveInteger(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function readCoordinates(body, fieldErrors) {
  const { latitude, longitude } = body;
  const latitudeMissing = latitude === undefined || latitude === null;
  const longitudeMissing = longitude === undefined || longitude === null;
  if (latitudeMissing && longitudeMissing) return { latitude: null, longitude: null };

  const isValid = typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!isValid) {
    fieldErrors.location = 'Your location could not be read. Please try again.';
    return { latitude: null, longitude: null };
  }
  return { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) };
}

// Checks the address form. zoneType decides which address fields apply.
// Returns { profile, fieldErrors }; fieldErrors is empty when all is well.
export function validateProfileInput(body, zoneType) {
  const fieldErrors = {};
  const profile = {
    name: readRequiredText(body, 'name', 'Your name', 80, fieldErrors),
    phone: normalizeIndianMobileNumber(body.phone),
    towerId: null,
    flatNumber: null,
    houseNumber: null,
    street: null,
    landmark: null,
    floor: null,
    ...readCoordinates(body, fieldErrors),
  };
  if (!profile.phone) fieldErrors.phone = 'Please enter a valid 10-digit mobile number.';

  if (zoneType === 'society') {
    profile.towerId = readPositiveInteger(body.towerId);
    if (!profile.towerId) fieldErrors.towerId = 'Please choose your tower or block.';
    profile.flatNumber = readRequiredText(body, 'flatNumber', 'Flat number', 20, fieldErrors);
  } else {
    profile.houseNumber = readRequiredText(body, 'houseNumber', 'House or shop number', 30, fieldErrors);
    profile.street = readRequiredText(body, 'street', 'Street', 80, fieldErrors);
    profile.landmark = readRequiredText(body, 'landmark', 'A landmark', 80, fieldErrors);
    profile.floor = readOptionalText(body, 'floor', 'Floor', 20, fieldErrors);
  }
  return { profile, fieldErrors };
}

const earthRadiusInKilometers = 6371;

// Straight-line (great-circle) distance between two points on Earth.
export function distanceInKilometers(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * earthRadiusInKilometers * Math.asin(Math.sqrt(haversine));
}
