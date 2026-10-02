import { normalizeIndianMobileNumber, readOptionalText, readPositiveInteger, readRequiredText } from './commonValidation.js';

export function readCoordinates(body, fieldErrors) {
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
