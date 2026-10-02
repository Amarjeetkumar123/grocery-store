import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceInKilometers, normalizeIndianMobileNumber, validateProfileInput } from '../src/validation.js';

test('mobile numbers are normalized to 10 digits', () => {
  assert.equal(normalizeIndianMobileNumber('98765 43210'), '9876543210');
  assert.equal(normalizeIndianMobileNumber('+91 98765-43210'), '9876543210');
  assert.equal(normalizeIndianMobileNumber('919876543210'), '9876543210');
  assert.equal(normalizeIndianMobileNumber('09876543210'), '9876543210');
  assert.equal(normalizeIndianMobileNumber('12345'), null);
  assert.equal(normalizeIndianMobileNumber('5876543210'), null);
  assert.equal(normalizeIndianMobileNumber(9876543210), null);
});

test('distance between two points in Gurugram is about 1.2 km', () => {
  const distance = distanceInKilometers(
    { latitude: 28.4595, longitude: 77.0266 },
    { latitude: 28.4700, longitude: 77.0300 },
  );
  assert.ok(distance > 1.1 && distance < 1.3, `got ${distance}`);
});

test('society address needs tower and flat number', () => {
  const { fieldErrors } = validateProfileInput({ name: 'Riya', phone: '9876543210' }, 'society');
  assert.deepEqual(Object.keys(fieldErrors).sort(), ['flatNumber', 'towerId']);
});

test('locality address needs house number, street and landmark; floor is optional', () => {
  const { fieldErrors } = validateProfileInput({ name: 'Amit', phone: '9811122334' }, 'locality');
  assert.deepEqual(Object.keys(fieldErrors).sort(), ['houseNumber', 'landmark', 'street']);

  const { profile, fieldErrors: noErrors } = validateProfileInput({
    name: '  Amit   Verma ', phone: '98111 22334', houseNumber: '42', street: 'Gali No. 3', landmark: 'Near Shiv Mandir',
  }, 'locality');
  assert.deepEqual(noErrors, {});
  assert.equal(profile.name, 'Amit Verma');
  assert.equal(profile.floor, null);
});

test('location must have both coordinates as valid numbers', () => {
  const base = { name: 'Riya', phone: '9876543210', towerId: 1, flatNumber: '1204' };
  assert.ok(validateProfileInput({ ...base, latitude: 28.5 }, 'society').fieldErrors.location);
  assert.ok(validateProfileInput({ ...base, latitude: '28.5', longitude: 77 }, 'society').fieldErrors.location);
  assert.ok(validateProfileInput({ ...base, latitude: 120, longitude: 77 }, 'society').fieldErrors.location);
  assert.deepEqual(validateProfileInput({ ...base, latitude: 28.5, longitude: 77 }, 'society').fieldErrors, {});
});

test('overly long text is rejected', () => {
  const { fieldErrors } = validateProfileInput({ name: 'x'.repeat(81), phone: '9876543210', towerId: 1, flatNumber: '1' }, 'society');
  assert.match(fieldErrors.name, /at most 80/);
});
