import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locationErrorMessage, readCoordinatePair } from './storeLocation.js';

test('reads the numbers copied from Google Maps', () => {
  assert.deepEqual(readCoordinatePair('28.5672, 77.388'), { latitude: '28.5672', longitude: '77.388' });
  assert.deepEqual(readCoordinatePair(' 28.567201,77.388012 '), { latitude: '28.567201', longitude: '77.388012' });
  assert.deepEqual(readCoordinatePair('-33.86, 151.2'), { latitude: '-33.86', longitude: '151.2' });
});

test('ignores text that is not a latitude, longitude pair', () => {
  assert.equal(readCoordinatePair('28.5672'), null);
  assert.equal(readCoordinatePair('Sector 74, Noida'), null);
  assert.equal(readCoordinatePair('128.5, 77.3'), null);
});

test('explains each location failure', () => {
  assert.match(locationErrorMessage(1), /allow Location/);
  assert.match(locationErrorMessage(2), /paste them into Store latitude/);
  assert.match(locationErrorMessage(3), /took too long/);
});
