import { findStoreLocation } from '../dbHelper/storeSettingsDbHelper.js';
import { distanceInKilometers } from '../utils/geography.js';

// Returns an error message when the location is beyond the delivery
// distance, or null when it is fine (or the store location is not set).
export async function checkDeliveryDistance(database, latitude, longitude) {
  const store = await findStoreLocation(database);
  if (store.latitude === null) return null;
  const distance = distanceInKilometers(store, { latitude, longitude });
  if (distance <= store.maximumDeliveryDistanceKilometers) return null;
  return `This location is ${distance.toFixed(1)} km from our store. `
    + `We deliver within ${store.maximumDeliveryDistanceKilometers} km.`;
}
