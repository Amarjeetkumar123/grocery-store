const customerProfileQuery = `
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
const upsertCustomerProfileQuery = `
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

export async function findCustomerProfileByUserId(executor, userId) {
  const result = await executor.query(customerProfileQuery, [userId]);
  return result.rows[0] ? toCustomerProfile(result.rows[0]) : null;
}

// Returns false when the customer is blocked (nothing is changed).
export async function upsertCustomerProfile(executor, user, zone, profile) {
  const result = await executor.query(upsertCustomerProfileQuery, [
    user.id, user.email, profile.name, profile.phone, zone.id, zone.type,
    profile.towerId, profile.flatNumber, profile.houseNumber, profile.street, profile.landmark,
    profile.floor, profile.latitude, profile.longitude,
  ]);
  return result.rowCount > 0;
}
