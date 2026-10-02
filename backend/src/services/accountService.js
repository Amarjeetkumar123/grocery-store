import { findCustomerProfileByUserId, upsertCustomerProfile } from '../dbHelper/customerDbHelper.js';
import { findNotifyMeCategoryIds, saveNotifyMe } from '../dbHelper/notifyMeDbHelper.js';
import { findActiveZoneById, isTowerInZone } from '../dbHelper/zoneDbHelper.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { validateProfileInput } from '../validators/profileValidation.js';
import { checkDeliveryDistance } from './deliveryDistance.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

// Who is signed in, their role, saved address and "notify me" requests.
async function getAccount({ database }, user, staffMember) {
  return {
    email: user.email,
    role: staffMember ? staffMember.role : 'customer',
    staffName: staffMember ? staffMember.name : null,
    profile: await findCustomerProfileByUserId(database, user.id),
    notifyMeCategoryIds: await findNotifyMeCategoryIds(database, user.id),
  };
}

// Create or update the customer's name, phone and delivery address.
async function saveProfile({ database }, user, body) {
  const zoneId = readPositiveInteger(body.zoneId);
  const zone = zoneId ? await findActiveZoneById(database, zoneId) : null;
  if (!zone) throw ServiceError.invalidFields({ zoneId: 'Please choose your society or area.' });

  const { profile, fieldErrors } = validateProfileInput(body, zone.type);
  if (profile.towerId && !(await isTowerInZone(database, profile.towerId, zone.id))) {
    fieldErrors.towerId = 'Please choose your tower or block.';
  }
  if (profile.latitude !== null) {
    const distanceError = await checkDeliveryDistance(database, profile.latitude, profile.longitude);
    if (distanceError) fieldErrors.location = distanceError;
  }
  throwIfFieldErrors(fieldErrors);

  const saved = await upsertCustomerProfile(database, user, zone, profile);
  if (!saved) throw ServiceError.forbidden('Your account is on hold. Please call the store.');
  return { profile: await findCustomerProfileByUserId(database, user.id) };
}

// "Notify me" on a coming-soon category such as Fruits & Vegetables.
async function requestNotifyMe({ database }, user, body) {
  const categoryId = readPositiveInteger(body.categoryId);
  if (!(await findCustomerProfileByUserId(database, user.id))) {
    throw ServiceError.badRequest('Please save your address first.');
  }
  if (categoryId) await saveNotifyMe(database, user.id, categoryId);
  const notifyMeCategoryIds = await findNotifyMeCategoryIds(database, user.id);
  if (!notifyMeCategoryIds.includes(categoryId)) throw ServiceError.badRequest('This category is already available.');
  return { notifyMeCategoryIds };
}

export function createAccountService(dependencies) {
  return {
    getAccount: (user, staffMember) => getAccount(dependencies, user, staffMember),
    saveProfile: (user, body) => saveProfile(dependencies, user, body),
    requestNotifyMe: (user, body) => requestNotifyMe(dependencies, user, body),
  };
}
