// Runs the real API against a throwaway local database.
// Needs TEST_DATABASE_URL (see .env.test.example); skipped without it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDatabasePool } from '../src/database.js';
import { createApplication } from '../src/application.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const skip = testDatabaseUrl ? false : 'TEST_DATABASE_URL is not set';

const usersByToken = {
  'customer-token': { id: '11111111-1111-1111-1111-111111111111', email: 'riya@example.com', emailConfirmed: true },
  'owner-token': { id: '22222222-2222-2222-2222-222222222222', email: 'owner@example.com', emailConfirmed: true },
  'unconfirmed-owner-token': { id: '33333333-3333-3333-3333-333333333333', email: 'owner@example.com', emailConfirmed: false },
};

let database;
let server;
let baseUrl;

before(async () => {
  if (skip) return;
  if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends with _test; it gets wiped.');
  }
  database = createDatabasePool(testDatabaseUrl);
  await database.query('drop schema public cascade; create schema public;');
  await database.query(readFileSync(new URL('../database/001_schema.sql', import.meta.url), 'utf8'));
  await database.query(readFileSync(new URL('../database/002_sample_data.sql', import.meta.url), 'utf8'));
  await database.query(`insert into staff (email, name, role) values ('owner@example.com', 'Sunil', 'owner')`);

  const application = createApplication({
    database,
    verifyAccessToken: async (accessToken) => usersByToken[accessToken] ?? null,
    allowedOrigins: ['http://localhost:5173'],
  });
  await new Promise((resolve) => { server = application.listen(0, resolve); });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server?.close();
  await database?.end();
});

async function callApi(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function findZone(zoneName) {
  const { body } = await callApi('/api/zones');
  return body.zones.find((zone) => zone.name === zoneName);
}

test('active zones are listed with their towers', { skip }, async () => {
  const { status, body } = await callApi('/api/zones');
  assert.equal(status, 200);
  assert.equal(body.zones.length, 3);
  const capetown = body.zones.find((zone) => zone.name === 'Supertech Capetown, Sector 74');
  assert.deepEqual(capetown.towers.map((tower) => tower.name), ['Tower A', 'Tower B', 'Tower C', 'Tower D']);
  assert.deepEqual((await findZone('Sector 73 Market Area')).towers, []);
});

test('account needs a valid login token', { skip }, async () => {
  assert.equal((await callApi('/api/account')).status, 401);
  assert.equal((await callApi('/api/account', { token: 'fake' })).status, 401);
});

test('staff are recognized by confirmed email and then by login id', { skip }, async () => {
  const unconfirmed = await callApi('/api/account', { token: 'unconfirmed-owner-token' });
  assert.equal(unconfirmed.body.role, 'customer');

  const owner = await callApi('/api/account', { token: 'owner-token' });
  assert.equal(owner.body.role, 'owner');
  assert.equal(owner.body.staffName, 'Sunil');

  const unconfirmedAgain = await callApi('/api/account', { token: 'unconfirmed-owner-token' });
  assert.equal(unconfirmedAgain.body.role, 'customer', 'once linked, the email alone no longer grants staff access');
});

test('customer saves a society address', { skip }, async () => {
  const capetown = await findZone('Supertech Capetown, Sector 74');
  const towerB = capetown.towers.find((tower) => tower.name === 'Tower B');

  const { status, body } = await callApi('/api/account/profile', {
    token: 'customer-token',
    method: 'PUT',
    body: { name: 'Riya Sharma', phone: '+91 98765 43210', zoneId: capetown.id, towerId: towerB.id, flatNumber: '1204' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.profile.phone, '9876543210');
  assert.equal(body.profile.towerName, 'Tower B');

  const account = await callApi('/api/account', { token: 'customer-token' });
  assert.equal(account.body.role, 'customer');
  assert.equal(account.body.profile.zoneName, 'Supertech Capetown, Sector 74');
});

test('tower from another zone is rejected', { skip }, async () => {
  const capetown = await findZone('Supertech Capetown, Sector 74');
  const mahagun = await findZone('Mahagun Moderne, Sector 78');
  const { status, body } = await callApi('/api/account/profile', {
    token: 'customer-token',
    method: 'PUT',
    body: { name: 'Riya', phone: '9876543210', zoneId: capetown.id, towerId: mahagun.towers[0].id, flatNumber: '1' },
  });
  assert.equal(status, 400);
  assert.ok(body.fieldErrors.towerId);
});

test('locality address: landmark required, location must be within delivery distance', { skip }, async () => {
  const sector73 = await findZone('Sector 73 Market Area');
  const address = { name: 'Riya Sharma', phone: '9876543210', zoneId: sector73.id, houseNumber: '42', street: 'Gali No. 3' };

  const missingLandmark = await callApi('/api/account/profile', { token: 'customer-token', method: 'PUT', body: address });
  assert.equal(missingLandmark.status, 400);
  assert.ok(missingLandmark.body.fieldErrors.landmark);

  const tooFar = await callApi('/api/account/profile', {
    token: 'customer-token',
    method: 'PUT',
    body: { ...address, landmark: 'Near Shiv Mandir', latitude: 28.6315, longitude: 77.2167 },
  });
  assert.equal(tooFar.status, 400);
  assert.match(tooFar.body.fieldErrors.location, /km from our store/);

  const nearby = await callApi('/api/account/profile', {
    token: 'customer-token',
    method: 'PUT',
    body: { ...address, landmark: 'Near Shiv Mandir', latitude: 28.5772, longitude: 77.391 },
  });
  assert.equal(nearby.status, 200, JSON.stringify(nearby.body));
  assert.equal(nearby.body.profile.zoneType, 'locality');
  assert.equal(nearby.body.profile.towerId, null, 'switching to a locality clears the old society address');
});

test('changing the phone number resets phone confirmation; blocked customers cannot edit', { skip }, async () => {
  await database.query(`update customers set phone_confirmed = true where email = 'riya@example.com'`);
  const sector73 = await findZone('Sector 73 Market Area');
  const address = { name: 'Riya', zoneId: sector73.id, houseNumber: '42', street: 'Gali No. 3', landmark: 'Near Shiv Mandir' };

  const samePhone = await callApi('/api/account/profile', { token: 'customer-token', method: 'PUT', body: { ...address, phone: '9876543210' } });
  assert.equal(samePhone.body.profile.phoneConfirmed, true);

  const newPhone = await callApi('/api/account/profile', { token: 'customer-token', method: 'PUT', body: { ...address, phone: '9123456789' } });
  assert.equal(newPhone.body.profile.phoneConfirmed, false);

  await database.query(`update customers set blocked = true where email = 'riya@example.com'`);
  const blocked = await callApi('/api/account/profile', { token: 'customer-token', method: 'PUT', body: { ...address, phone: '9123456789' } });
  assert.equal(blocked.status, 403);
});

test('unknown routes and broken JSON get clean errors', { skip }, async () => {
  assert.equal((await callApi('/api/nothing-here')).status, 404);
  const response = await fetch(`${baseUrl}/api/account/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
    body: '{not json',
  });
  assert.equal(response.status, 400);
});
