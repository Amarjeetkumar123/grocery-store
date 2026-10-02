import { normalizeIndianMobileNumber, readOptionalText, readPositiveInteger, readRequiredText } from './commonValidation.js';
import { readMoney, readWholeNumber } from './productValidation.js';
import { readCoordinates } from './profileValidation.js';

const zoneTypes = ['society', 'locality'];
const timePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const upiIdPattern = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const longestCutoffMinutes = 7 * 24 * 60;

// 0 is a valid charge or minimum here, unlike a product price.
function readAmountOrZero(value) {
  return value === 0 || value === '0' ? 0 : readMoney(value);
}

function readBoolean(value, defaultValue) {
  return typeof value === 'boolean' ? value : defaultValue;
}

// isNew: the type can only be chosen when the zone is created.
export function validateZoneInput(body, isNew) {
  const fieldErrors = {};
  const zone = {
    name: readRequiredText(body, 'name', 'Zone name', 80, fieldErrors),
    type: isNew ? body.type : null,
    active: readBoolean(body.active, true),
    minimumOrderValue: readAmountOrZero(body.minimumOrderValue ?? 0),
    deliveryCharge: readAmountOrZero(body.deliveryCharge ?? 0),
    freeDeliveryAbove: body.freeDeliveryAbove === '' || body.freeDeliveryAbove == null
      ? null : readAmountOrZero(body.freeDeliveryAbove),
  };
  if (isNew && !zoneTypes.includes(zone.type)) fieldErrors.type = 'Choose society or local area.';
  if (zone.minimumOrderValue === null) fieldErrors.minimumOrderValue = 'Enter an amount in rupees (0 for none).';
  if (zone.deliveryCharge === null) fieldErrors.deliveryCharge = 'Enter an amount in rupees (0 for free).';
  if (zone.freeDeliveryAbove === null && body.freeDeliveryAbove !== '' && body.freeDeliveryAbove != null) {
    fieldErrors.freeDeliveryAbove = 'Enter an amount in rupees, or leave it empty.';
  }
  return { zone, fieldErrors };
}

function readDays(value) {
  if (!Array.isArray(value)) return null;
  const days = [...new Set(value)].sort((first, second) => first - second);
  const valid = days.length > 0 && days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return valid ? days : null;
}

// days: 0 = Sunday ... 6 = Saturday. Times are "07:00" style.
export function validateSlotInput(body) {
  const fieldErrors = {};
  const slot = {
    name: readRequiredText(body, 'name', 'Slot name', 40, fieldErrors),
    days: readDays(body.days),
    startTime: timePattern.test(body.startTime) ? body.startTime : null,
    endTime: timePattern.test(body.endTime) ? body.endTime : null,
    cutoffMinutesBefore: readWholeNumber(body.cutoffMinutesBefore, longestCutoffMinutes),
    maximumOrders: readPositiveInteger(body.maximumOrders),
    active: readBoolean(body.active, true),
  };
  if (!slot.days) fieldErrors.days = 'Choose at least one day.';
  if (!slot.startTime) fieldErrors.startTime = 'Choose a start time.';
  if (!slot.endTime) fieldErrors.endTime = 'Choose an end time.';
  else if (slot.startTime && slot.endTime <= slot.startTime) fieldErrors.endTime = 'End time must be after the start time.';
  if (slot.cutoffMinutesBefore === null) fieldErrors.cutoffMinutesBefore = 'The cutoff can be at most 7 days before.';
  if (!slot.maximumOrders || slot.maximumOrders > 1000) fieldErrors.maximumOrders = 'Enter a number from 1 to 1000.';
  return { slot, fieldErrors };
}

function readDistance(value) {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && number >= 0.1 && number <= 50 ? Math.round(number * 100) / 100 : null;
}

export function validateStoreSettingsInput(body) {
  const fieldErrors = {};
  const upiId = readOptionalText(body, 'upiId', 'UPI ID', 300, fieldErrors);
  const whatsappInput = readOptionalText(body, 'whatsappNumber', 'WhatsApp number', 20, fieldErrors);
  const settings = {
    storeName: readRequiredText(body, 'storeName', 'Store name', 60, fieldErrors),
    ...readCoordinates(body, fieldErrors),
    maximumDeliveryDistanceKilometers: readDistance(body.maximumDeliveryDistanceKilometers),
    upiId,
    whatsappNumber: whatsappInput ? normalizeIndianMobileNumber(whatsappInput) : null,
  };
  if (!settings.maximumDeliveryDistanceKilometers) fieldErrors.maximumDeliveryDistanceKilometers = 'Enter between 0.1 and 50 km.';
  if (upiId && !upiIdPattern.test(upiId)) fieldErrors.upiId = 'A UPI ID looks like yourstore@okhdfcbank.';
  if (whatsappInput && !settings.whatsappNumber) fieldErrors.whatsappNumber = 'Enter a valid 10-digit mobile number.';
  return { settings, fieldErrors };
}
