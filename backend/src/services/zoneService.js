import { foreignKeyViolationErrorCode, uniqueViolationErrorCode } from '../dbHelper/databaseConnection.js';
import { findAllSlots, insertSlot, updateSlot } from '../dbHelper/slotDbHelper.js';
import { deleteTower, findAllZonesForAdmin, insertTower, insertZone, updateZone } from '../dbHelper/zoneDbHelper.js';
import { readPositiveInteger, readRequiredText } from '../validators/commonValidation.js';
import { validateSlotInput, validateZoneInput } from '../validators/zoneValidation.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

// Turns database rule errors into messages the owner understands.
async function withFriendlyErrors(work, { duplicate, inUse }) {
  try {
    return await work();
  } catch (error) {
    if (error.code === uniqueViolationErrorCode && duplicate) throw ServiceError.conflict(duplicate);
    if (error.code === foreignKeyViolationErrorCode && inUse) throw ServiceError.conflict(inUse);
    throw error;
  }
}

function requireId(idInput, message) {
  const id = readPositiveInteger(idInput);
  if (!id) throw ServiceError.notFound(message);
  return id;
}

// Every zone with its towers and slots, for the Zones & slots page.
async function listZones({ database }) {
  const [zones, slots] = await Promise.all([findAllZonesForAdmin(database), findAllSlots(database)]);
  return { zones: zones.map((zone) => ({ ...zone, slots: slots.filter((slot) => slot.zoneId === zone.id) })) };
}

async function createZone({ database }, body) {
  const { zone, fieldErrors } = validateZoneInput(body, true);
  throwIfFieldErrors(fieldErrors);
  const zoneId = await withFriendlyErrors(() => insertZone(database, zone), { duplicate: 'A zone with this name already exists.' });
  return { zoneId };
}

async function saveZone({ database }, zoneIdInput, body) {
  const zoneId = requireId(zoneIdInput, 'Zone not found.');
  const { zone, fieldErrors } = validateZoneInput(body, false);
  throwIfFieldErrors(fieldErrors);
  const updated = await withFriendlyErrors(() => updateZone(database, zoneId, zone), { duplicate: 'A zone with this name already exists.' });
  if (!updated) throw ServiceError.notFound('Zone not found.');
  return { zoneId };
}

async function addTower({ database }, zoneIdInput, body) {
  const zoneId = requireId(zoneIdInput, 'Zone not found.');
  const fieldErrors = {};
  const name = readRequiredText(body, 'name', 'Tower name', 40, fieldErrors);
  throwIfFieldErrors(fieldErrors);
  const towerId = await withFriendlyErrors(() => insertTower(database, zoneId, name), { duplicate: 'That tower is already added.' });
  if (!towerId) throw ServiceError.notFound('Towers can only be added to a society.');
  return { towerId };
}

async function removeTower({ database }, towerIdInput) {
  const towerId = requireId(towerIdInput, 'Tower not found.');
  const deleted = await withFriendlyErrors(() => deleteTower(database, towerId), {
    inUse: 'Customers have saved this tower in their address, so it cannot be removed.',
  });
  if (!deleted) throw ServiceError.notFound('Tower not found.');
  return { towerId };
}

async function createSlot({ database }, zoneIdInput, body) {
  const zoneId = requireId(zoneIdInput, 'Zone not found.');
  const { slot, fieldErrors } = validateSlotInput(body);
  throwIfFieldErrors(fieldErrors);
  const slotId = await withFriendlyErrors(() => insertSlot(database, zoneId, slot), { inUse: 'Zone not found.' });
  return { slotId };
}

// Slots are never deleted (orders point at them); switch them off instead.
async function saveSlot({ database }, slotIdInput, body) {
  const slotId = requireId(slotIdInput, 'Slot not found.');
  const { slot, fieldErrors } = validateSlotInput(body);
  throwIfFieldErrors(fieldErrors);
  if (!(await updateSlot(database, slotId, slot))) throw ServiceError.notFound('Slot not found.');
  return { slotId };
}

export function createZoneService(dependencies) {
  return {
    listZones: () => listZones(dependencies),
    createZone: (body) => createZone(dependencies, body),
    saveZone: (zoneIdInput, body) => saveZone(dependencies, zoneIdInput, body),
    addTower: (zoneIdInput, body) => addTower(dependencies, zoneIdInput, body),
    removeTower: (towerIdInput) => removeTower(dependencies, towerIdInput),
    createSlot: (zoneIdInput, body) => createSlot(dependencies, zoneIdInput, body),
    saveSlot: (slotIdInput, body) => saveSlot(dependencies, slotIdInput, body),
  };
}
