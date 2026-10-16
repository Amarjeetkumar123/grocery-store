// Ratings and reviews, and pack types, against a throwaway local database.
// Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const usersByToken = {
  'owner-token': { id: 'dddddddd-0000-0000-0000-000000000001', email: 'owner@example.com', emailVerifiedByGoogle: true },
  'packer-token': { id: 'dddddddd-0000-0000-0000-000000000002', email: 'packer@example.com', emailVerifiedByGoogle: true },
  'riya-token': { id: 'dddddddd-0000-0000-0000-000000000003', email: 'riya@example.com', emailVerifiedByGoogle: true },
  'aman-token': { id: 'dddddddd-0000-0000-0000-000000000004', email: 'aman@example.com', emailVerifiedByGoogle: true },
};

const extraSql = `
  insert into staff (email, name, role) values ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer');
  insert into products (category_id, name, brand) select id, 'Toor Dal', 'Test' from categories where name = 'Dals & Pulses';
  insert into pack_sizes (product_id, label, pack_type, maximum_retail_price, price, stock)
    select id, '1 kg', 'Pouch', 185, 165, 10 from products;
  insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders)
    select id, 'Anytime', '{0,1,2,3,4,5,6}', '07:00', '09:00', 0, 20 from zones where name like 'Supertech%';`;

let testServer;
let callApi;
let productId;

const reviewPath = () => `/api/account/reviews/${productId}`;
const saveReview = (token, body) => callApi(reviewPath(), { token, method: 'PUT', body });

before(async () => {
  if (skip) return;
  testServer = await startTestServer({ usersByToken, extraSql });
  callApi = testServer.callApi;
  const query = (sql) => testServer.database.query(sql).then((result) => result.rows);
  const tomorrow = (await query("select ((now() at time zone 'Asia/Kolkata')::date + 1)::text as day"))[0].day;
  const [row] = await query(`
    select zone.id as zone_id, tower.id as tower_id, slot.id as slot_id, pack.id as pack_id, pack.product_id
    from zones zone join towers tower on tower.zone_id = zone.id join slots slot on slot.zone_id = zone.id, pack_sizes pack
    where slot.name = 'Anytime' limit 1`);
  productId = row.product_id;
  const profile = { zoneId: row.zone_id, towerId: row.tower_id, flatNumber: '1204', phone: '9876543210' };
  await callApi('/api/account/profile', { token: 'riya-token', method: 'PUT', body: { ...profile, name: 'Riya Sharma' } });
  await callApi('/api/account/profile', { token: 'aman-token', method: 'PUT', body: { ...profile, name: 'Aman', phone: '9876543211' } });
  const order = { items: [{ packSizeId: row.pack_id, quantity: 2 }], slotId: row.slot_id, deliveryDate: tomorrow };
  await callApi('/api/orders', { token: 'riya-token', method: 'POST', body: order });
  await callApi('/api/orders', { token: 'aman-token', method: 'POST', body: order });
});

after(async () => {
  await testServer?.stop();
});

test('pack type comes with each pack size', { skip }, async () => {
  const { body } = await callApi(`/api/products/${productId}`);
  assert.equal(body.product.packSizes[0].packType, 'Pouch');
  assert.deepEqual(body.product.rating, { average: null, count: 0 });
});

test('only a customer whose order was delivered can rate', { skip }, async () => {
  assert.equal((await callApi(reviewPath(), { token: 'riya-token' })).body.canReview, false);
  assert.equal((await saveReview('riya-token', { rating: 5 })).status, 403);
  await testServer.database.query("update orders set status = 'delivered' where order_number = 1001");
  const mine = (await callApi(reviewPath(), { token: 'riya-token' })).body;
  assert.equal(mine.canReview, true);
  assert.equal(mine.purchase.packLabel, '1 kg');
  assert.equal((await saveReview('riya-token', { rating: 6 })).status, 400);
  assert.equal((await saveReview('riya-token', { rating: 4, tags: ['Made up'] })).status, 400);
  assert.equal((await saveReview('aman-token', { rating: 1 })).status, 403);
});

test('a rating is saved once per customer and shows on the product', { skip }, async () => {
  const saved = await saveReview('riya-token', { rating: 4, tags: ['Fresh'], body: 'Good dal' });
  assert.equal(saved.status, 200);
  assert.equal((await saveReview('riya-token', { rating: 5, tags: ['Fresh', 'Good packing'], body: 'Very good dal' })).status, 200);
  const { body } = await callApi(`/api/products/${productId}/reviews`);
  assert.deepEqual(body.summary, { average: 5, ratingCount: 1, reviewCount: 1, starCounts: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 } });
  assert.equal(body.reviews.length, 1);
  assert.equal(body.reviews[0].customerName, 'Riya S.');
  assert.equal(body.reviews[0].body, 'Very good dal');
  assert.equal(body.reviews[0].packLabel, '1 kg');
  assert.deepEqual((await callApi(`/api/products/${productId}`)).body.product.rating, { average: 5, count: 1 });
  assert.equal((await callApi('/api/orders/1001', { token: 'riya-token' })).body.order.items[0].myRating, 5);
  assert.equal((await callApi(`/api/products/${productId}/reviews?stars=low`)).body.reviews.length, 0);
});

test('the owner sees every review and can hide one', { skip }, async () => {
  assert.equal((await callApi('/api/admin/reviews', { token: 'packer-token' })).status, 403);
  const list = (await callApi('/api/admin/reviews?show=text', { token: 'owner-token' })).body;
  assert.equal(list.total, 1);
  assert.deepEqual(list.totals, { average: 5, shownCount: 1, hiddenCount: 0 });
  const reviewId = list.reviews[0].id;
  assert.equal((await callApi(`/api/admin/reviews/${reviewId}`, { token: 'owner-token', method: 'PUT', body: {} })).status, 400);
  assert.equal((await callApi(`/api/admin/reviews/${reviewId}`, { token: 'owner-token', method: 'PUT', body: { hidden: true } })).status, 200);
  const { body } = await callApi(`/api/products/${productId}/reviews`);
  assert.equal(body.summary.ratingCount, 0);
  assert.equal(body.reviews.length, 0);
  assert.equal((await callApi('/api/admin/reviews?show=hidden', { token: 'owner-token' })).body.total, 1);
});
