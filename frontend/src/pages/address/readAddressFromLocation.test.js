import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressPartsOf, fillEmptyFields, matchZone } from './readAddressFromLocation.js';

const mapAddress = { house_number: '112', road: 'Main Road', amenity: 'Shiv Mandir', suburb: 'Sector 73', city: 'Noida' };
const zones = [{ id: 1, name: 'Mahagun Moderne, Sector 78' }, { id: 3, name: 'Sector 73 Market Area' }];

test('reads house, street and a nearby landmark from the map address', () => {
  const parts = addressPartsOf(mapAddress);
  assert.deepEqual([parts.houseNumber, parts.street, parts.landmark], ['112', 'Main Road', 'Near Shiv Mandir']);
  assert.deepEqual(addressPartsOf({}), { houseNumber: '', street: '', landmark: '', placeNames: [] });
});

test('picks the zone whose name shares a whole place name, ignoring case', () => {
  assert.equal(matchZone(zones, ['sector 73'])?.id, 3);
  assert.equal(matchZone(zones, ['Sector 10']), null);
  assert.equal(matchZone(zones, ['Sector 7']), null, 'Sector 7 is not Sector 73 or 78');
});

test('ignores the patchy one-letter names the map sometimes has', () => {
  const parts = addressPartsOf({ road: 'g', amenity: 'Multi Level Car Parking', suburb: 'Chilla' });
  assert.deepEqual([parts.street, parts.landmark], ['', 'Near Multi Level Car Parking']);
  assert.equal(matchZone([{ id: 1, name: 'Mahagun Moderne' }], parts.placeNames), null);
});

test('fills only empty boxes and keeps what the customer typed', () => {
  const typed = { zoneId: '', houseNumber: 'Shop 4', street: '', landmark: '', floor: '' };
  const filled = fillEmptyFields(typed, addressPartsOf(mapAddress), zones[1]);
  assert.deepEqual(filled, { zoneId: '3', houseNumber: 'Shop 4', street: 'Main Road', landmark: 'Near Shiv Mandir', floor: '' });
});
