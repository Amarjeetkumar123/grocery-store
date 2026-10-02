export async function findStoreDetails(executor) {
  const result = await executor.query('select store_name, whatsapp_number from store_settings where id = 1');
  const row = result.rows[0];
  return { name: row.store_name, whatsappNumber: row.whatsapp_number };
}

// latitude and longitude are null until the owner sets the shop location.
export async function findStoreLocation(executor) {
  const result = await executor.query(
    'select store_latitude, store_longitude, max_delivery_distance_km from store_settings where id = 1',
  );
  const row = result.rows[0];
  return {
    latitude: row.store_latitude,
    longitude: row.store_longitude,
    maximumDeliveryDistanceKilometers: row.max_delivery_distance_km,
  };
}
