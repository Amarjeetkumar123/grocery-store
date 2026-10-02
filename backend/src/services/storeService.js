import { findStoreDetails, findStoreSettings, updateStoreSettings } from '../dbHelper/storeSettingsDbHelper.js';
import { findActiveZonesWithTowers } from '../dbHelper/zoneDbHelper.js';
import { validateStoreSettingsInput } from '../validators/zoneValidation.js';
import { throwIfFieldErrors } from './serviceError.js';

async function saveStoreSettings({ database }, body) {
  const { settings, fieldErrors } = validateStoreSettingsInput(body);
  throwIfFieldErrors(fieldErrors);
  await updateStoreSettings(database, settings);
  return { settings: await findStoreSettings(database) };
}

// Public store information (name, WhatsApp number, delivery zones), and
// the owner's store settings.
export function createStoreService(dependencies) {
  const { database } = dependencies;
  return {
    getStoreDetails: () => findStoreDetails(database),
    listActiveZones: async () => ({ zones: await findActiveZonesWithTowers(database) }),
    getStoreSettings: async () => ({ settings: await findStoreSettings(database) }),
    saveStoreSettings: (body) => saveStoreSettings(dependencies, body),
  };
}
