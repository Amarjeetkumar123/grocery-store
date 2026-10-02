// Cart, slots, placing and cancelling orders, and the owner's zone screens,
// against a throwaway local database. Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const usersByToken = {
  'owner-token': { id: 'bbbbbbbb-0000-0000-0000-000000000001', email: 'owner@example.com', emailVerifiedByGoogle: true },
  'packer-token': { id: 'bbbbbbbb-0000-0000-0000-000000000002', email: 'packer@example.com', emailVerifiedByGoogle: true },
  'riya-token': { id: 'bbbbbbbb-0000-0000-0000-000000000003', email: 'riya@example.com', emailVerifiedByGoogle: true },
  'neha-token': { id: 'bbbbbbbb-0000-0000-0000-000000000004', email: 'neha@example.com', emailVerifiedByGoogle: true },
};

// Capetown: minimum ₹199, delivery ₹30, free above ₹499.
const extraSql = `
  insert into staff (email, name, role) values ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer');
  insert into products (category_id, name, brand, active)
    select id, product.name, 'Test', product.active from categories,
      (values ('Toor Dal', true), ('Sunflower Oil', true), ('Old Oil', false)) as product(name, active)
    where categories.name = 'Dals & Pulses';
  insert into pack_sizes (product_id, label, maximum_retail_price, price, stock)
    select id, '1 kg', 185, 165, 5 from products where name = 'Toor Dal'
    union all select id, '5 L', 850, 740, 10 from products where name = 'Sunflower Oil'
    union all select id, '1 L', 100, 90, 10 from products where name = 'Old Oil';
  insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders)
    select id, slot.name, '{0,1,2,3,4,5,6}', '07:00', '09:00', slot.cutoff, 2 from zones,
      (values ('Anytime', 0), ('Week ahead', 10080)) as slot(name, cutoff)
    where zones.name like 'Supertech%';`;

let testServer;
let callApi;
let packSizeIds;
let slotIds;
let tomorrow;
let orderNumber;

async function queryValue(sql, values) {
  return Object.values((await testServer.database.query(sql, values)).rows[0])[0];
}

const stockOf = (label) => queryValue('select stock from pack_sizes where label = $1', [label]);
const placeOrder = (body, token = 'riya-token') => callApi('/api/orders', { token, method: 'POST', body });
const cartOf = (toorQuantity, oilQuantity = 0) => [
  { packSizeId: packSizeIds['1 kg'], quantity: toorQuantity },
  { packSizeId: packSizeIds['5 L'], quantity: oilQuantity },
].filter((item) => item.quantity > 0);

before(async () => {
  if (skip) return;
  testServer = await startTestServer({ usersByToken, extraSql });
  callApi = testServer.callApi;
  const { rows: packs } = await testServer.database.query('select id, label from pack_sizes');
  packSizeIds = Object.fromEntries(packs.map((pack) => [pack.label, pack.id]));
  const { rows: slots } = await testServer.database.query(
    "select slot.id, slot.name, zone.name like 'Supertech%' as capetown from slots slot join zones zone on zone.id = slot.zone_id",
  );
  slotIds = Object.fromEntries(slots.filter((slot) => slot.capetown).map((slot) => [slot.name, slot.id]));
  slotIds.otherZone = slots.find((slot) => !slot.capetown).id;
  tomorrow = await queryValue("select ((now() at time zone 'Asia/Kolkata')::date + 1)::text");
  const towerId = await queryValue("select id from towers where name = 'Tower B' and zone_id = (select id from zones where name like 'Supertech%')");
  const zoneId = await queryValue("select id from zones where name like 'Supertech%'");
  await callApi('/api/account/profile', {
    token: 'riya-token', method: 'PUT', body: { zoneId, towerId, flatNumber: '1204', name: 'Riya', phone: '9876543210' },
  });
});

after(async () => {
  await testServer?.stop();
});

test('cart prices come from the database, with delivery free above the zone amount', { skip }, async () => {
  const items = [...cartOf(2, 1), { packSizeId: packSizeIds['1 L'], quantity: 1 }];
  const { status, body } = await callApi('/api/checkout/quote', { token: 'riya-token', method: 'POST', body: { items } });
  assert.equal(status, 200);
  assert.equal(body.cart.itemsTotal, 1070);
  assert.equal(body.cart.deliveryCharge, 0);
  assert.equal(body.cart.total, 1070);
  assert.equal(body.cart.lines.find((line) => line.packLabel === '1 L').problem, 'This item is no longer sold.');
  assert.equal(body.cart.hasProblems, true);
  assert.equal(body.cart.lines[0].stock, undefined, 'customers never see the stock count');

  const small = await callApi('/api/checkout/quote', { token: 'riya-token', method: 'POST', body: { items: cartOf(1) } });
  assert.deepEqual([small.body.cart.itemsTotal, small.body.cart.deliveryCharge, small.body.cart.meetsMinimum], [165, 30, false]);
});

test('only open slots of the customer zone are offered', { skip }, async () => {
  const { body } = await callApi('/api/checkout/slots', { token: 'riya-token' });
  const tomorrowSlots = body.slots.filter((slot) => slot.deliveryDate === tomorrow);
  assert.ok(tomorrowSlots.some((slot) => slot.slotId === slotIds.Anytime && slot.placesLeft === 2));
  assert.ok(!body.slots.some((slot) => slot.slotId === slotIds['Week ahead'] && slot.deliveryDate === tomorrow));
  assert.ok(!body.slots.some((slot) => slot.slotId === slotIds.otherZone));
});

test('placing an order saves it and takes the stock', { skip }, async () => {
  const { status, body } = await placeOrder({ items: cartOf(2, 1), slotId: slotIds.Anytime, deliveryDate: tomorrow });
  assert.equal(status, 201);
  assert.equal(body.orderNumber, 1001);
  orderNumber = body.orderNumber;
  assert.deepEqual([await stockOf('1 kg'), await stockOf('5 L')], [3, 9]);

  const { body: detail } = await callApi(`/api/orders/${orderNumber}`, { token: 'riya-token' });
  assert.equal(detail.order.total, 1070);
  assert.equal(detail.order.status, 'new');
  assert.equal(detail.order.address.towerName, 'Tower B');
  assert.equal(detail.order.items.length, 2);
});

test('orders are refused below the minimum, for closed or other-zone slots, or without stock', { skip }, async () => {
  const belowMinimum = await placeOrder({ items: cartOf(1), slotId: slotIds.Anytime, deliveryDate: tomorrow });
  assert.equal(belowMinimum.status, 400);
  const closedSlot = await placeOrder({ items: cartOf(0, 1), slotId: slotIds['Week ahead'], deliveryDate: tomorrow });
  assert.deepEqual([closedSlot.status, closedSlot.body.slotChanged], [409, true]);
  const otherZone = await placeOrder({ items: cartOf(0, 1), slotId: slotIds.otherZone, deliveryDate: tomorrow });
  assert.equal(otherZone.status, 409);
  const tooMany = await placeOrder({ items: cartOf(4), slotId: slotIds.Anytime, deliveryDate: tomorrow });
  assert.deepEqual([tooMany.status, tooMany.body.cartChanged], [409, true]);
  assert.equal(await stockOf('1 kg'), 3, 'a refused order changes nothing');
});

test('a full slot takes no more orders', { skip }, async () => {
  const second = await placeOrder({ items: cartOf(0, 1), slotId: slotIds.Anytime, deliveryDate: tomorrow });
  assert.equal(second.status, 201);
  const third = await placeOrder({ items: cartOf(0, 1), slotId: slotIds.Anytime, deliveryDate: tomorrow });
  assert.deepEqual([third.status, third.body.slotChanged], [409, true]);
});

test('customers see only their own orders, newest first', { skip }, async () => {
  const { body } = await callApi('/api/orders', { token: 'riya-token' });
  assert.deepEqual(body.orders.map((order) => order.orderNumber), [1002, 1001]);
  assert.equal((await callApi(`/api/orders/${orderNumber}`, { token: 'neha-token' })).status, 404);
  assert.equal((await callApi(`/api/orders/${orderNumber}/cancel`, { token: 'neha-token', method: 'POST' })).status, 404);
});

test('cancelling puts the stock back; packed orders cannot be cancelled', { skip }, async () => {
  const { status, body } = await callApi(`/api/orders/${orderNumber}/cancel`, { token: 'riya-token', method: 'POST' });
  assert.equal(status, 200);
  assert.equal(body.order.status, 'cancelled');
  assert.deepEqual([await stockOf('1 kg'), await stockOf('5 L')], [5, 9]);
  assert.equal((await callApi(`/api/orders/${orderNumber}/cancel`, { token: 'riya-token', method: 'POST' })).status, 409);

  await testServer.database.query("update orders set status = 'packed' where order_number = 1002");
  assert.equal((await callApi('/api/orders/1002/cancel', { token: 'riya-token', method: 'POST' })).status, 409);
});

test('owner manages zones, towers and slots; packers cannot', { skip }, async () => {
  assert.equal((await callApi('/api/admin/zones', { token: 'packer-token' })).status, 403);
  const { body } = await callApi('/api/admin/zones', { token: 'owner-token' });
  const capetown = body.zones.find((zone) => zone.name.startsWith('Supertech'));
  assert.equal(capetown.customerCount, 1);
  assert.ok(capetown.slots.some((slot) => slot.name === 'Anytime'));

  const duplicate = await callApi('/api/admin/zones', { token: 'owner-token', method: 'POST', body: { name: capetown.name, type: 'society' } });
  assert.equal(duplicate.status, 409);
  const locality = body.zones.find((zone) => zone.type === 'locality');
  assert.equal((await callApi(`/api/admin/zones/${locality.id}/towers`, { token: 'owner-token', method: 'POST', body: { name: 'X' } })).status, 404);
  assert.equal((await callApi(`/api/admin/zones/${capetown.id}/towers`, { token: 'owner-token', method: 'POST', body: { name: 'Tower A' } })).status, 409);
  const towerB = capetown.towers.find((tower) => tower.name === 'Tower B');
  assert.equal((await callApi(`/api/admin/towers/${towerB.id}`, { token: 'owner-token', method: 'DELETE' })).status, 409);

  const badSlot = await callApi(`/api/admin/zones/${capetown.id}/slots`, {
    token: 'owner-token', method: 'POST',
    body: { name: 'Late', days: [1], startTime: '20:00', endTime: '19:00', cutoffMinutesBefore: 60, maximumOrders: 10 },
  });
  assert.equal(badSlot.status, 400);
  assert.ok(badSlot.body.fieldErrors.endTime);
});

test('owner saves store settings, with the UPI ID and WhatsApp number checked', { skip }, async () => {
  const settings = {
    storeName: 'Grocery Store', latitude: 28.5672, longitude: 77.388, maximumDeliveryDistanceKilometers: 4,
    upiId: 'not a upi id', whatsappNumber: '98765 43210',
  };
  const invalid = await callApi('/api/admin/store-settings', { token: 'owner-token', method: 'PUT', body: settings });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.fieldErrors.upiId);
  const saved = await callApi('/api/admin/store-settings', { token: 'owner-token', method: 'PUT', body: { ...settings, upiId: 'store@okhdfcbank' } });
  assert.equal(saved.status, 200);
  assert.deepEqual([saved.body.settings.whatsappNumber, saved.body.settings.maximumDeliveryDistanceKilometers], ['9876543210', 4]);
});

test('three orders at the same moment for a 2-order slot: exactly 2 get in', { skip }, async () => {
  const dayAfterTomorrow = await queryValue("select ((now() at time zone 'Asia/Kolkata')::date + 2)::text");
  const order = { items: cartOf(0, 1), slotId: slotIds.Anytime, deliveryDate: dayAfterTomorrow };
  const results = await Promise.all([placeOrder(order), placeOrder(order), placeOrder(order)]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 201, 409]);
  assert.equal(await stockOf('5 L'), 7);
});
