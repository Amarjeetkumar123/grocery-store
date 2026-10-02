import { Router } from 'express';
import { distanceInKilometers, readPositiveInteger, validateProfileInput } from '../validation.js';

const loadCustomerProfileQuery = `
  select customer.name, customer.phone, customer.phone_confirmed, customer.blocked,
         customer.zone_id, zone.name as zone_name, customer.zone_type,
         customer.tower_id, tower.name as tower_name, customer.flat_number,
         customer.house_number, customer.street, customer.landmark, customer.floor,
         customer.latitude, customer.longitude
  from customers customer
  join zones zone on zone.id = customer.zone_id
  left join towers tower on tower.id = customer.tower_id
  where customer.user_id = $1`;

// A changed phone number has to be confirmed again on WhatsApp.
// Blocked customers cannot change their details (no row comes back).
const saveCustomerProfileQuery = `
  insert into customers (user_id, email, name, phone, zone_id, zone_type, tower_id, flat_number,
                         house_number, street, landmark, floor, latitude, longitude)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  on conflict (user_id) do update set
    email = excluded.email,
    name = excluded.name,
    phone = excluded.phone,
    phone_confirmed = customers.phone_confirmed and customers.phone = excluded.phone,
    zone_id = excluded.zone_id,
    zone_type = excluded.zone_type,
    tower_id = excluded.tower_id,
    flat_number = excluded.flat_number,
    house_number = excluded.house_number,
    street = excluded.street,
    landmark = excluded.landmark,
    floor = excluded.floor,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now()
  where not customers.blocked
  returning id`;

function toCustomerProfile(row) {
  return {
    name: row.name,
    phone: row.phone,
    phoneConfirmed: row.phone_confirmed,
    blocked: row.blocked,
    zoneId: row.zone_id,
    zoneName: row.zone_name,
    zoneType: row.zone_type,
    towerId: row.tower_id,
    towerName: row.tower_name,
    flatNumber: row.flat_number,
    houseNumber: row.house_number,
    street: row.street,
    landmark: row.landmark,
    floor: row.floor,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

async function loadCustomerProfile(database, userId) {
  const result = await database.query(loadCustomerProfileQuery, [userId]);
  return result.rows[0] ? toCustomerProfile(result.rows[0]) : null;
}

async function findActiveZone(database, zoneIdInput) {
  const zoneId = readPositiveInteger(zoneIdInput);
  if (!zoneId) return null;
  const result = await database.query('select id, type from zones where id = $1 and active', [zoneId]);
  return result.rows[0] ?? null;
}

async function isTowerInZone(database, towerId, zoneId) {
  const result = await database.query('select 1 from towers where id = $1 and zone_id = $2', [towerId, zoneId]);
  return result.rowCount > 0;
}

// Returns an error message when the location is beyond the delivery
// distance, or null when it is fine (or the store location is not set).
async function checkDeliveryDistance(database, latitude, longitude) {
  const result = await database.query(
    'select store_latitude, store_longitude, max_delivery_distance_km from store_settings where id = 1',
  );
  const store = result.rows[0];
  if (store.store_latitude === null) return null;

  const distance = distanceInKilometers(
    { latitude: store.store_latitude, longitude: store.store_longitude },
    { latitude, longitude },
  );
  if (distance <= store.max_delivery_distance_km) return null;
  return `This location is ${distance.toFixed(1)} km from our store. `
    + `We deliver within ${store.max_delivery_distance_km} km.`;
}

async function saveCustomerProfile(database, user, zone, profile) {
  const result = await database.query(saveCustomerProfileQuery, [
    user.id, user.email, profile.name, profile.phone, zone.id, zone.type,
    profile.towerId, profile.flatNumber, profile.houseNumber, profile.street, profile.landmark,
    profile.floor, profile.latitude, profile.longitude,
  ]);
  return result.rowCount > 0;
}

function rejectWithFieldErrors(response, fieldErrors) {
  return response.status(400).json({ error: 'Please check the highlighted fields.', fieldErrors });
}

// Everything here needs a signed-in user (see application.js).
export function createAccountRouter(database) {
  const router = Router();

  // Who is signed in, their role, and their saved address.
  router.get('/', async (request, response) => {
    response.json({
      email: request.user.email,
      role: request.staffMember ? request.staffMember.role : 'customer',
      staffName: request.staffMember ? request.staffMember.name : null,
      profile: await loadCustomerProfile(database, request.user.id),
    });
  });

  // Create or update the customer's name, phone and delivery address.
  router.put('/profile', async (request, response) => {
    const body = request.body ?? {};
    const zone = await findActiveZone(database, body.zoneId);
    if (!zone) return rejectWithFieldErrors(response, { zoneId: 'Please choose your society or area.' });

    const { profile, fieldErrors } = validateProfileInput(body, zone.type);
    if (profile.towerId && !(await isTowerInZone(database, profile.towerId, zone.id))) {
      fieldErrors.towerId = 'Please choose your tower or block.';
    }
    if (profile.latitude !== null) {
      const distanceError = await checkDeliveryDistance(database, profile.latitude, profile.longitude);
      if (distanceError) fieldErrors.location = distanceError;
    }
    if (Object.keys(fieldErrors).length > 0) return rejectWithFieldErrors(response, fieldErrors);

    const saved = await saveCustomerProfile(database, request.user, zone, profile);
    if (!saved) return response.status(403).json({ error: 'Your account is on hold. Please call the store.' });

    response.json({ profile: await loadCustomerProfile(database, request.user.id) });
  });

  return router;
}
