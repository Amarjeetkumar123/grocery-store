import { findStoreDetails } from '../dbHelper/storeSettingsDbHelper.js';
import { findActiveZonesWithTowers } from '../dbHelper/zoneDbHelper.js';

// Public store information: name, WhatsApp number and delivery zones.
export function createStoreService({ database }) {
  return {
    getStoreDetails: () => findStoreDetails(database),
    listActiveZones: async () => ({ zones: await findActiveZonesWithTowers(database) }),
  };
}
