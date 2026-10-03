// Rider screens, payment at the door, the cash check and reports, against a
// throwaway local database. Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const user = (number, email) => ({ id: `dddddddd-0000-0000-0000-00000000000${number}`, email, emailVerifiedByGoogle: true });
const usersByToken = {
  'owner-token': user(1, 'owner@example.com'),
  'packer-token': user(2, 'packer@example.com'),
  'ravi-token': user(3, 'ravi@example.com'),
  'mohan-token': user(4, 'mohan@example.com'),
  'riya-token': user(5, 'riya@example.com'),
};

const extraSql = `
  insert into staff (email, name, role) values ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer'),
    ('ravi@example.com', 'Ravi', 'rider'), ('mohan@example.com', 'Mohan', 'rider');
  insert into products (category_id, name, brand) select id, 'Toor Dal', 'Test' from categories where name = 'Dals & Pulses';
  insert into pack_sizes (product_id, label, maximum_retail_price, price, stock) select id, '1 kg', 185, 165, 50 from products;
  insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders)
    select id, 'Anytime', '{0,1,2,3,4,5,6}', '07:00', '09:00', 0, 20 from zones where name like 'Supertech%';`;

let testServer;
let callApi;
let today;
let tomorrow;
let staffIds;

const rider = (token, path, body) => callApi(`/api/rider${path}`, { token, method: body === undefined ? 'GET' : 'POST', body });
const asOwner = (path, body) => callApi(`/api/admin${path}`, { token: 'owner-token', method: body === undefined ? 'GET' : 'POST', body });

async function placeOrders(quantities) {
  const query = (sql) => testServer.database.query(sql).then((result) => result.rows[0]);
  const { zone_id: zoneId, tower_id: towerId, slot_id: slotId, pack_id: packSizeId } = await query(`
    select zone.id as zone_id, tower.id as tower_id, slot.id as slot_id, (select id from pack_sizes) as pack_id
    from zones zone join towers tower on tower.zone_id = zone.id join slots slot on slot.zone_id = zone.id where slot.name = 'Anytime' limit 1`);
  await callApi('/api/account/profile', { token: 'riya-token', method: 'PUT', body: { zoneId, towerId, flatNumber: '1204', name: 'Riya', phone: '9876543210' } });
  for (const quantity of quantities) {
    await callApi('/api/orders', { token: 'riya-token', method: 'POST', body: { items: [{ packSizeId, quantity }], slotId, deliveryDate: tomorrow } });
  }
}

// 1001 and 1002 go with Ravi, 1003 with Mohan; 1004 stays new.
async function prepareForDelivery() {
  for (const orderNumber of [1001, 1002, 1003]) {
    await asOwner(`/orders/${orderNumber}/status`, { status: 'confirmed' });
    await asOwner(`/orders/${orderNumber}/status`, { status: 'packed' });
  }
  await asOwner('/orders/assign-rider', { orderNumbers: [1001, 1002], riderId: staffIds.Ravi });
  await asOwner('/orders/assign-rider', { orderNumbers: [1003], riderId: staffIds.Mohan });
}

before(async () => {
  if (skip) return;
  testServer = await startTestServer({ usersByToken, extraSql });
  callApi = testServer.callApi;
  const dates = (await testServer.database.query(`select (now() at time zone 'Asia/Kolkata')::date::text as today,
    ((now() at time zone 'Asia/Kolkata')::date + 1)::text as tomorrow`)).rows[0];
  ({ today, tomorrow } = dates);
  staffIds = Object.fromEntries((await testServer.database.query('select id, name from staff')).rows.map((row) => [row.name, row.id]));
  // ₹165 a pack, ₹30 delivery below ₹499: totals ₹360, ₹525, ₹660 (free delivery), ₹360.
  await placeOrders([2, 3, 4, 2]);
  await prepareForDelivery();
});

after(async () => {
  await testServer?.stop();
});

test('riders see only their own deliveries; others cannot use rider screens', { skip }, async () => {
  const { body } = await rider('ravi-token', `/deliveries?date=${tomorrow}`);
  assert.deepEqual(body.orders.map((order) => order.orderNumber), [1001, 1002]);
  assert.deepEqual([body.cashInHand, body.store.upiId], [0, 'yourstore@upi']);
  assert.equal((await rider('riya-token', '/deliveries')).status, 403);
  assert.equal((await rider('packer-token', '/deliveries')).status, 403);
  assert.equal((await callApi('/api/admin/orders?date=x', { token: 'ravi-token' })).status, 403);
});

test('at the door: start, take payment once, then delivered', { skip }, async () => {
  assert.equal((await rider('mohan-token', '/orders/1001/start', {})).status, 404, "not Mohan's order");
  assert.equal((await rider('ravi-token', '/orders/1001/payment', { method: 'cash' })).status, 409, 'not started yet');
  assert.equal((await rider('ravi-token', '/orders/1001/start', {})).status, 200);
  assert.equal((await rider('ravi-token', '/orders/1001/delivered', {})).status, 400, 'payment first');
  assert.equal((await rider('ravi-token', '/orders/1001/payment', { method: 'card' })).status, 400);
  assert.equal((await rider('ravi-token', '/orders/1001/payment', { method: 'cash' })).status, 200);
  assert.equal((await rider('ravi-token', '/orders/1001/payment', { method: 'upi' })).status, 409, 'paid once only');
  assert.equal((await rider('ravi-token', '/orders/1001/delivered', {})).status, 200);

  for (const step of ['/orders/1002/start', '/orders/1003/start']) await rider(step.includes('1002') ? 'ravi-token' : 'mohan-token', step, {});
  await rider('ravi-token', '/orders/1002/payment', { method: 'upi' });
  await rider('ravi-token', '/orders/1002/delivered', {});
  await rider('mohan-token', '/orders/1003/payment', { method: 'cash' });
  const { body } = await rider('ravi-token', `/deliveries?date=${tomorrow}`);
  assert.deepEqual(body.orders.map((order) => [order.status, order.paymentMethod]), [['delivered', 'cash'], ['delivered', 'upi']]);
  assert.equal(body.cashInHand, 360);
});

test('a paid order cannot be cancelled; the owner can mark it delivered', { skip }, async () => {
  assert.equal((await asOwner('/orders/1003/cancel', { reason: 'Changed mind' })).status, 409);
  assert.equal((await asOwner('/orders/1003/delivered', {})).status, 200);
});

test('cash check shows what each rider collected and still holds', { skip }, async () => {
  const { body } = await asOwner(`/cash-check?date=${today}`);
  const ravi = body.collections.find((collection) => collection.name === 'Ravi');
  assert.deepEqual([ravi.cashToday, ravi.upiToday, ravi.cashInHand], [360, 525, 360]);
  const unpaid = await asOwner(`/cash-check?date=${tomorrow}`);
  assert.deepEqual(unpaid.body.unpaidOrders.map((order) => order.orderNumber), [1004]);

  assert.equal((await asOwner('/cash-handovers', { staffId: staffIds.Ravi, amount: 400 })).status, 400, 'more than he holds');
  assert.equal((await asOwner('/cash-handovers', { staffId: staffIds.Ravi, amount: 360 })).status, 201);
  assert.equal((await rider('ravi-token', `/deliveries?date=${tomorrow}`)).body.cashInHand, 0);
});

test('reports add up delivered sales, split by cash and UPI', { skip }, async () => {
  const { body } = await asOwner(`/reports?from=${today}&to=${tomorrow}`);
  const { report } = body;
  assert.deepEqual([report.deliveredOrders, report.sales, report.cashSales, report.upiSales], [3, 1545, 1020, 525]);
  assert.deepEqual(report.topItems[0], { productName: 'Toor Dal', packLabel: '1 kg', quantity: 9, sales: 1485 });
  assert.equal(report.byZone.length, 1);
  assert.equal((await asOwner(`/reports?from=${tomorrow}&to=${today}`)).status, 400);
});

test('the dashboard shows how full tomorrow\'s slots are, for the owner only', { skip }, async () => {
  assert.equal((await callApi('/api/admin/dashboard', { token: 'packer-token' })).status, 403);
  const { body } = await asOwner('/dashboard');
  const busy = body.slots.filter((slot) => slot.ordersTaken > 0);
  assert.deepEqual(busy.map((slot) => [slot.startTime, slot.ordersTaken, slot.ordersWaiting, slot.maximumOrders]), [['07:00', 4, 1, 20]]);
  assert.equal(body.tomorrow, tomorrow);
  assert.deepEqual([body.stock.outOfStock, body.stock.alerts], [0, []]);
  assert.equal(body.salesWeek.sales, 0, 'tomorrow\'s deliveries are not in the last 7 days');
});
