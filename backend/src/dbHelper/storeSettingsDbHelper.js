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

export async function findStoreSettings(executor) {
  const result = await executor.query(
    `select store_name, store_latitude, store_longitude, max_delivery_distance_km, upi_id, whatsapp_number
     from store_settings where id = 1`,
  );
  const row = result.rows[0];
  return {
    storeName: row.store_name,
    latitude: row.store_latitude,
    longitude: row.store_longitude,
    maximumDeliveryDistanceKilometers: row.max_delivery_distance_km,
    upiId: row.upi_id,
    whatsappNumber: row.whatsapp_number,
  };
}

export async function updateStoreSettings(executor, settings) {
  await executor.query(
    `update store_settings set store_name = $1, store_latitude = $2, store_longitude = $3,
                               max_delivery_distance_km = $4, upi_id = $5, whatsapp_number = $6
     where id = 1`,
    [settings.storeName, settings.latitude, settings.longitude, settings.maximumDeliveryDistanceKilometers,
      settings.upiId, settings.whatsappNumber],
  );
}
