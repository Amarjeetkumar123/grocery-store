// Order alerts (web push): subscribing, and who gets which alert.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fakePushSender, skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const user = (number, email) => ({ id: `eeeeeeee-0000-0000-0000-00000000000${number}`, email, emailVerifiedByGoogle: true });
const usersByToken = { 'owner-token': user(1, 'owner@example.com'), 'ravi-token': user(2, 'ravi@example.com'), 'riya-token': user(3, 'riya@example.com') };
const endpointFor = (name) => `https://fcm.googleapis.com/fcm/send/${name}`;
const browserOf = (name) => ({ endpoint: endpointFor(name), keys: { p256dh: 'test-key', auth: 'test-auth' } });

const extraSql = `
  insert into staff (email, name, role) values ('owner@example.com', 'Sunil', 'owner'), ('ravi@example.com', 'Ravi', 'rider');
  insert into products (category_id, name) select id, 'Toor Dal' from categories where name = 'Dals & Pulses';
  insert into pack_sizes (product_id, label, maximum_retail_price, price, stock) select id, '1 kg', 185, 165, 50 from products;
  insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders)
    select id, 'Anytime', '{0,1,2,3,4,5,6}', '07:00', '09:00', 0, 20 from zones where name like 'Supertech%';`;

let testServer;
let callApi;

const subscribe = (token, body) => callApi('/api/push/subscriptions', { token, method: 'POST', body });
const alertsTo = (name) => fakePushSender.sentMessages.filter((message) => message.endpoint === endpointFor(name));

// Alerts go out in the background, so wait a moment for them.
async function waitFor(check) {
  for (let attempt = 0; attempt < 50 && !check(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(check(), 'expected alert did not arrive');
}

before(async () => {
  if (skip) return;
  testServer = await startTestServer({ usersByToken, extraSql });
  callApi = testServer.callApi;
});

after(async () => {
  await testServer?.stop();
});

test('anyone gets the public key; only real push services are accepted', { skip }, async () => {
  assert.deepEqual((await callApi('/api/push/public-key')).body, { publicKey: 'test-public-key' });
  assert.equal((await subscribe(null, browserOf('owner-phone'))).status, 401);
  assert.equal((await subscribe('owner-token', { ...browserOf('x'), endpoint: 'http://192.168.1.5/steal' })).status, 400);
  assert.equal((await subscribe('owner-token', { ...browserOf('x'), endpoint: 'https://fcm.googleapis.com.evil.example/x' })).status, 400);
  for (const [token, name] of [['owner-token', 'owner-phone'], ['ravi-token', 'ravi-phone'], ['riya-token', 'riya-phone'], ['owner-token', 'old-gone-laptop']]) {
    assert.equal((await subscribe(token, browserOf(name))).status, 201);
  }
});

test('a new order alerts the shop, status changes alert the customer, assignment alerts the rider', { skip }, async () => {
  const { rows: [setup] } = await testServer.database.query(`
    select zone.id as zone_id, tower.id as tower_id, slot.id as slot_id, (select id from pack_sizes) as pack_id,
           ((now() at time zone 'Asia/Kolkata')::date + 1)::text as tomorrow
    from zones zone join towers tower on tower.zone_id = zone.id join slots slot on slot.zone_id = zone.id limit 1`);
  await callApi('/api/account/profile', { token: 'riya-token', method: 'PUT', body: { zoneId: setup.zone_id, towerId: setup.tower_id, flatNumber: '1', name: 'Riya', phone: '9876543210' } });
  await callApi('/api/orders', { token: 'riya-token', method: 'POST', body: { items: [{ packSizeId: setup.pack_id, quantity: 2 }], slotId: setup.slot_id, deliveryDate: setup.tomorrow } });
  await waitFor(() => alertsTo('owner-phone').length === 1);
  assert.equal(alertsTo('owner-phone')[0].title, 'New order #1001');
  assert.equal(alertsTo('riya-phone').length, 0, 'the customer is not told about their own new order');

  await callApi('/api/admin/orders/1001/status', { token: 'owner-token', method: 'POST', body: { status: 'confirmed' } });
  await waitFor(() => alertsTo('riya-phone').length === 1);
  assert.deepEqual([alertsTo('riya-phone')[0].title, alertsTo('riya-phone')[0].url], ['Order #1001 confirmed', '/orders/1001']);

  const { rows: [ravi] } = await testServer.database.query("select id from staff where name = 'Ravi'");
  await callApi('/api/admin/orders/assign-rider', { token: 'owner-token', method: 'POST', body: { orderNumbers: [1001], riderId: ravi.id } });
  await waitFor(() => alertsTo('ravi-phone').length === 1);
  assert.equal(alertsTo('ravi-phone')[0].title, '1 delivery given to you');
});

test('dropped subscriptions are cleaned up, and users can turn alerts off', { skip }, async () => {
  const remaining = async () => (await testServer.database.query('select endpoint from push_subscriptions order by endpoint')).rows.map((row) => row.endpoint);
  await waitFor(() => alertsTo('old-gone-laptop').length > 0);
  assert.ok(!(await remaining()).includes(endpointFor('old-gone-laptop')));
  await callApi('/api/push/subscriptions', { token: 'riya-token', method: 'DELETE', body: { endpoint: endpointFor('owner-phone') } });
  assert.ok((await remaining()).includes(endpointFor('owner-phone')), "cannot remove someone else's");
  await callApi('/api/push/subscriptions', { token: 'riya-token', method: 'DELETE', body: { endpoint: endpointFor('riya-phone') } });
  assert.ok(!(await remaining()).includes(endpointFor('riya-phone')));
});
