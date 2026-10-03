// Order board, riders, staff and customers screens, against a throwaway
// local database. Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const usersByToken = {
  'owner-token': { id: 'cccccccc-0000-0000-0000-000000000001', email: 'owner@example.com', emailVerifiedByGoogle: true },
  'packer-token': { id: 'cccccccc-0000-0000-0000-000000000002', email: 'packer@example.com', emailVerifiedByGoogle: true },
  'riya-token': { id: 'cccccccc-0000-0000-0000-000000000003', email: 'riya@example.com', emailVerifiedByGoogle: true },
};

const extraSql = `
  insert into staff (email, name, role) values
    ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer'), ('ravi@example.com', 'Ravi', 'rider');
  insert into products (category_id, name, brand) select id, 'Toor Dal', 'Test' from categories where name = 'Dals & Pulses';
  insert into pack_sizes (product_id, label, maximum_retail_price, price, stock) select id, '1 kg', 185, 165, 10 from products;
  insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders)
    select id, 'Anytime', '{0,1,2,3,4,5,6}', '07:00', '09:00', 0, 20 from zones where name like 'Supertech%';`;

let testServer;
let callApi;
let tomorrow;
let staffIds;

const asOwner = (path, options = {}) => callApi(path, { token: 'owner-token', ...options });
const moveTo = (orderNumber, status, token = 'owner-token') => callApi(`/api/admin/orders/${orderNumber}/status`, { token, method: 'POST', body: { status } });
const boardOrder = async (orderNumber) => (await asOwner(`/api/admin/orders?date=${tomorrow}`)).body.orders.find((order) => order.orderNumber === orderNumber);
const stockOfDal = async () => (await testServer.database.query("select stock from pack_sizes where label = '1 kg'")).rows[0].stock;

before(async () => {
  if (skip) return;
  testServer = await startTestServer({ usersByToken, extraSql });
  callApi = testServer.callApi;
  const query = (sql) => testServer.database.query(sql).then((result) => result.rows);
  tomorrow = (await query("select ((now() at time zone 'Asia/Kolkata')::date + 1)::text as day"))[0].day;
  staffIds = Object.fromEntries((await query('select id, name from staff')).map((member) => [member.name, member.id]));
  const [{ zone_id: zoneId, tower_id: towerId, slot_id: slotId, pack_id: packSizeId }] = await query(`
    select zone.id as zone_id, tower.id as tower_id, slot.id as slot_id, (select id from pack_sizes) as pack_id
    from zones zone join towers tower on tower.zone_id = zone.id join slots slot on slot.zone_id = zone.id
    where slot.name = 'Anytime' limit 1`);
  await callApi('/api/account/profile', { token: 'riya-token', method: 'PUT', body: { zoneId, towerId, flatNumber: '1204', name: 'Riya', phone: '9876543210' } });
  const order = { items: [{ packSizeId, quantity: 2 }], slotId, deliveryDate: tomorrow };
  for (let count = 0; count < 2; count += 1) await callApi('/api/orders', { token: 'riya-token', method: 'POST', body: order });
});

after(async () => {
  await testServer?.stop();
});

test('the board lists a day of orders for owner and packer, not customers', { skip }, async () => {
  assert.equal((await callApi(`/api/admin/orders?date=${tomorrow}`, { token: 'riya-token' })).status, 403);
  assert.equal((await asOwner('/api/admin/orders')).status, 400);
  const { body } = await callApi(`/api/admin/orders?date=${tomorrow}`, { token: 'packer-token' });
  assert.deepEqual(body.orders.map((order) => order.orderNumber), [1001, 1002]);
  const [first, second] = body.orders;
  assert.deepEqual([first.customer.firstOrder, second.customer.firstOrder, first.customer.phoneConfirmed], [true, false, false]);
  assert.equal(first.address.towerName, 'Tower A');
  assert.equal(first.items[0].quantity, 2);
});

test('orders move forward one step at a time, by the right person', { skip }, async () => {
  assert.equal((await moveTo(1001, 'confirmed', 'packer-token')).status, 403);
  assert.equal((await moveTo(1001, 'confirmed')).status, 200);
  assert.equal((await moveTo(1001, 'confirmed')).status, 409, 'already confirmed');
  assert.equal((await moveTo(1001, 'delivered')).status, 400, 'delivered comes with payment in Week 5');
  assert.equal((await moveTo(1001, 'packed', 'packer-token')).status, 200);
  assert.equal((await moveTo(1001, 'out_for_delivery')).status, 400, 'needs a rider');
});

test('only the owner assigns riders, and only active riders', { skip }, async () => {
  const assign = (riderId, token = 'owner-token') => callApi('/api/admin/orders/assign-rider', { token, method: 'POST', body: { orderNumbers: [1001], riderId } });
  assert.equal((await assign(staffIds.Ravi, 'packer-token')).status, 403);
  assert.equal((await assign(staffIds.Pooja)).status, 400, 'a packer is not a rider');
  assert.deepEqual((await assign(staffIds.Ravi)).body.assignedOrderNumbers, [1001]);
  assert.equal((await moveTo(1001, 'out_for_delivery')).status, 200);
  assert.deepEqual((await boardOrder(1001)).rider, { id: staffIds.Ravi, name: 'Ravi' });
});

test('the owner cancels with a reason and the stock comes back', { skip }, async () => {
  assert.equal(await stockOfDal(), 6);
  const cancel = (body) => asOwner('/api/admin/orders/1002/cancel', { method: 'POST', body });
  assert.equal((await cancel({})).status, 400);
  assert.equal((await callApi('/api/admin/orders/1002/cancel', { token: 'packer-token', method: 'POST', body: { reason: 'x' } })).status, 403);
  assert.equal((await cancel({ reason: 'Out of stock, sorry' })).status, 200);
  assert.equal(await stockOfDal(), 8);
  const { body } = await callApi('/api/orders/1002', { token: 'riya-token' });
  assert.deepEqual([body.order.status, body.order.cancelReason], ['cancelled', 'Out of stock, sorry']);
});

test('the owner manages the team but cannot lock themselves out', { skip }, async () => {
  assert.equal((await callApi('/api/admin/staff', { token: 'packer-token' })).status, 403);
  const added = await asOwner('/api/admin/staff', { method: 'POST', body: { email: 'Mohan@Example.com', name: 'Mohan', role: 'rider' } });
  assert.equal(added.status, 201);
  const duplicate = await asOwner('/api/admin/staff', { method: 'POST', body: { email: 'mohan@example.com', name: 'Mohan', role: 'rider' } });
  assert.ok(duplicate.body.fieldErrors.email);
  const selfDemote = await asOwner(`/api/admin/staff/${staffIds.Sunil}`, { method: 'PUT', body: { name: 'Sunil', role: 'packer', active: true } });
  assert.equal(selfDemote.status, 400);

  await asOwner(`/api/admin/staff/${staffIds.Ravi}`, { method: 'PUT', body: { name: 'Ravi', role: 'rider', active: false } });
  const { body } = await asOwner('/api/admin/staff');
  assert.deepEqual(body.staff.map((member) => [member.name, member.active, member.signedIn]).slice(0, 2), [['Sunil', true, true], ['Pooja', true, true]]);
  assert.equal(body.staff.find((member) => member.email === 'mohan@example.com').signedIn, false);
});

test('the owner finds customers, confirms phones and blocks', { skip }, async () => {
  const { body } = await asOwner('/api/admin/customers?search=9876');
  assert.equal(body.customers.length, 1);
  const [riya] = body.customers;
  assert.deepEqual([riya.name, riya.orderCount, riya.phoneConfirmed], ['Riya', 1, false]);

  await asOwner(`/api/admin/customers/${riya.id}`, { method: 'PUT', body: { phoneConfirmed: true } });
  assert.equal((await boardOrder(1001)).customer.phoneConfirmed, true);
  await asOwner(`/api/admin/customers/${riya.id}`, { method: 'PUT', body: { blocked: true } });
  const blockedOrder = await callApi('/api/checkout/slots', { token: 'riya-token' });
  assert.equal(blockedOrder.status, 403);
  const history = await asOwner(`/api/admin/orders?customerId=${riya.id}`);
  assert.equal(history.body.orders.length, 2);
});
