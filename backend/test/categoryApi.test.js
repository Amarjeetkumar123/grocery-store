// Admin category management, against a throwaway local database.
// Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fakePushSender, skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const shopperEndpoint = 'https://fcm.googleapis.com/fcm/send/shopper';
const usersByToken = {
  'owner-token': { id: 'aaaaaaaa-0000-0000-0000-000000000011', email: 'owner@example.com', emailVerifiedByGoogle: true },
  'packer-token': { id: 'aaaaaaaa-0000-0000-0000-000000000012', email: 'packer@example.com', emailVerifiedByGoogle: true },
};
const owner = { token: 'owner-token' };
const fakePngBytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

let testServer;
let callApi;
let snacksId;

before(async () => {
  if (skip) return;
  testServer = await startTestServer({
    usersByToken,
    extraSql: `insert into staff (email, name, role) values
      ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer')`,
  });
  callApi = testServer.callApi;
});

after(async () => {
  await testServer?.stop();
});

const findByName = (categories, name) => categories.find((category) => category.name === name);

test('only the owner manages categories', { skip }, async () => {
  assert.equal((await callApi('/api/admin/categories', { token: 'packer-token' })).status, 403);
  const { status, body } = await callApi('/api/admin/categories', owner);
  assert.equal(status, 200);
  const rice = findByName(body.categories, 'Rice');
  assert.equal(rice.productCount, 0);
  assert.equal(rice.imageUrl, null);
});

test('a new category needs a name, a sensible order and a unique name', { skip }, async () => {
  const empty = await callApi('/api/admin/categories', { ...owner, method: 'POST', body: { name: ' ', sortOrder: -1 } });
  assert.equal(empty.status, 400);
  assert.ok(empty.body.fieldErrors.name);
  assert.ok(empty.body.fieldErrors.sortOrder);
  const duplicate = await callApi('/api/admin/categories', { ...owner, method: 'POST', body: { name: 'Rice' } });
  assert.match(duplicate.body.fieldErrors.name, /already/);

  const created = await callApi('/api/admin/categories', { ...owner, method: 'POST', body: { name: 'Snacks', sortOrder: 0, comingSoon: true } });
  assert.equal(created.status, 201);
  snacksId = findByName(created.body.categories, 'Snacks').id;
  assert.equal(created.body.categoryId, snacksId);
  const shop = await callApi('/api/categories');
  assert.equal(shop.body.categories[0].name, 'Snacks');
  assert.equal(shop.body.categories[0].comingSoon, true);
});

// A shopper who tapped "Notify me" on Snacks, with alerts turned on.
async function addShopperWaitingFor(categoryId) {
  await testServer.database.query(`
    with shopper as (
      insert into customers (user_id, name, phone, zone_id, zone_type, house_number, street, landmark)
      select 'aaaaaaaa-0000-0000-0000-000000000013', 'Riya', '9876543210', id, type, '12', 'Market Road', 'Near temple'
      from zones where type = 'locality' limit 1
      returning id, zone_id
    )
    insert into notify_me (customer_id, category_id, zone_id) select id, $1, zone_id from shopper`, [categoryId]);
  await testServer.database.query(
    `insert into push_subscriptions (user_id, endpoint, keys) values ('aaaaaaaa-0000-0000-0000-000000000013', $1, '{"p256dh":"k","auth":"a"}')`,
    [shopperEndpoint],
  );
}

const waitForAlerts = () => new Promise((resolve) => { setTimeout(resolve, 200); });

test('owner renames a category, opens it and adds a photo the shop can see', { skip }, async () => {
  await addShopperWaitingFor(snacksId);
  const missing = await callApi('/api/admin/categories/99999', { ...owner, method: 'PUT', body: { name: 'Nothing' } });
  assert.equal(missing.status, 404);
  const renamed = await callApi(`/api/admin/categories/${snacksId}`, {
    ...owner, method: 'PUT', body: { name: 'Snacks & Namkeen', sortOrder: 7, comingSoon: false },
  });
  assert.equal(findByName(renamed.body.categories, 'Snacks & Namkeen').comingSoon, false);
  await waitForAlerts();
  const alerts = fakePushSender.sentMessages.filter((message) => message.endpoint === shopperEndpoint);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].title, 'Snacks & Namkeen is now in the shop');
  await callApi(`/api/admin/categories/${snacksId}`, { ...owner, method: 'PUT', body: { name: 'Snacks & Namkeen', sortOrder: 8 } });
  await waitForAlerts();
  assert.equal(fakePushSender.sentMessages.filter((message) => message.endpoint === shopperEndpoint).length, 1, 'only when it opens');

  const notAnImage = await callApi(`/api/admin/categories/${snacksId}/image`, { ...owner, method: 'POST', rawBody: Buffer.from('hello'), contentType: 'image/png' });
  assert.equal(notAnImage.status, 400);
  await callApi(`/api/admin/categories/${snacksId}/image`, { ...owner, method: 'POST', rawBody: fakePngBytes, contentType: 'image/png' });
  const shop = await callApi('/api/categories');
  assert.equal(findByName(shop.body.categories, 'Snacks & Namkeen').imageUrl, `https://storage.test/categories/${snacksId}-test.png`);
});

test('a category with products cannot be deleted; an empty one can', { skip }, async () => {
  await callApi('/api/admin/products', {
    ...owner, method: 'POST',
    body: { categoryId: snacksId, name: 'Haldiram Bhujia', packSizes: [{ label: '400 g', maximumRetailPrice: 110, price: 99, stock: 5 }] },
  });
  const blocked = await callApi(`/api/admin/categories/${snacksId}`, { ...owner, method: 'DELETE' });
  assert.equal(blocked.status, 409);

  const { body } = await callApi('/api/admin/categories', owner);
  const fruitsId = findByName(body.categories, 'Fruits & Vegetables').id;
  const deleted = await callApi(`/api/admin/categories/${fruitsId}`, { ...owner, method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal(findByName(deleted.body.categories, 'Fruits & Vegetables'), undefined);
});
