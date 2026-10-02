// Catalogue, admin products, stock and bulk import, against a throwaway
// local database. Tests run in order and build on each other.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fakeProductImageStorage, skipWithoutDatabase as skip, startTestServer } from './testServer.js';

const usersByToken = {
  'owner-token': { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'owner@example.com', emailVerifiedByGoogle: true },
  'packer-token': { id: 'aaaaaaaa-0000-0000-0000-000000000002', email: 'packer@example.com', emailVerifiedByGoogle: true },
  'customer-token': { id: 'aaaaaaaa-0000-0000-0000-000000000003', email: 'riya@example.com', emailVerifiedByGoogle: true },
};

let testServer;
let callApi;
let categoryIds;
let sunflowerOil;

before(async () => {
  if (skip) return;
  testServer = await startTestServer({
    usersByToken,
    extraSql: `insert into staff (email, name, role) values
      ('owner@example.com', 'Sunil', 'owner'), ('packer@example.com', 'Pooja', 'packer')`,
  });
  callApi = testServer.callApi;
  const { body } = await callApi('/api/categories');
  categoryIds = Object.fromEntries(body.categories.map((category) => [category.name, category.id]));
});

after(async () => {
  await testServer?.stop();
});

const sunflowerOilForm = () => ({
  categoryId: categoryIds['Oils & Ghee'],
  name: 'Fortune Sunflower Oil',
  brand: 'Fortune',
  manufacturer: 'Adani Wilmar',
  packSizes: [
    { label: '1 L', maximumRetailPrice: 180, price: 155, stock: 40 },
    { label: '5 L', maximumRetailPrice: '1,050', price: '899', stock: 3, lowStockLevel: 5, bestBefore: '2027-03-31' },
  ],
});

test('categories are listed in order, fruits and vegetables marked coming soon', { skip }, async () => {
  const { body } = await callApi('/api/categories');
  assert.equal(body.categories[0].name, 'Oils & Ghee');
  assert.equal(body.categories.find((category) => category.name === 'Fruits & Vegetables').comingSoon, true);
});

test('only staff reach admin; packers cannot edit products', { skip }, async () => {
  assert.equal((await callApi('/api/admin/products', { token: 'customer-token' })).status, 403);
  assert.equal((await callApi('/api/admin/products', { token: 'packer-token' })).status, 200);
  assert.equal((await callApi('/api/admin/stock', { token: 'packer-token' })).status, 200);
  const packerCreate = await callApi('/api/admin/products', { token: 'packer-token', method: 'POST', body: sunflowerOilForm() });
  assert.equal(packerCreate.status, 403);
});

test('product form is checked: price above MRP, repeated pack size, missing category', { skip }, async () => {
  const form = sunflowerOilForm();
  form.categoryId = 999;
  form.packSizes[0].price = 200;
  form.packSizes[1].label = '1 l';
  const { status, body } = await callApi('/api/admin/products', { token: 'owner-token', method: 'POST', body: form });
  assert.equal(status, 400);
  assert.ok(body.fieldErrors.categoryId);
  assert.match(body.fieldErrors['packSizes.0.price'], /more than the MRP/);
  assert.match(body.fieldErrors['packSizes.1.label'], /twice/);
});

test('owner adds a product with two pack sizes', { skip }, async () => {
  const { status, body } = await callApi('/api/admin/products', { token: 'owner-token', method: 'POST', body: sunflowerOilForm() });
  assert.equal(status, 201, JSON.stringify(body));
  sunflowerOil = body.product;
  assert.deepEqual(sunflowerOil.packSizes.map((packSize) => [packSize.label, packSize.price, packSize.stock]),
    [['1 L', 155, 40], ['5 L', 899, 3]]);
  assert.equal(sunflowerOil.packSizes[1].bestBefore, '2027-03-31');
});

test('customers see stock status, never the stock count', { skip }, async () => {
  const { body } = await callApi(`/api/products?categoryId=${categoryIds['Oils & Ghee']}`);
  const [packOne, packFive] = body.products[0].packSizes;
  assert.equal(packOne.stock, undefined);
  assert.equal(packOne.inStock, true);
  assert.equal(packFive.fewLeft, true);
  assert.equal((await callApi(`/api/products/${sunflowerOil.id}`)).body.product.name, 'Fortune Sunflower Oil');
});

test('search finds by name or brand, needs 2 letters, treats % as a normal character', { skip }, async () => {
  assert.equal((await callApi('/api/products?search=fortune')).body.products.length, 1);
  assert.equal((await callApi('/api/products?search=SUNFLOWER')).body.products.length, 1);
  assert.equal((await callApi('/api/products?search=%25%25')).body.products.length, 0);
  assert.equal((await callApi('/api/products?search=a')).status, 400);
});

test('editing changes prices, adds and hides pack sizes, but never touches stock', { skip }, async () => {
  const [packOne] = sunflowerOil.packSizes;
  const form = { ...sunflowerOilForm(), packSizes: [
    { id: packOne.id, label: '1 L', maximumRetailPrice: 180, price: 149, stock: 999 },
    { label: '15 L tin', maximumRetailPrice: 2900, price: 2640, stock: 6 },
  ] };
  const { status, body } = await callApi(`/api/admin/products/${sunflowerOil.id}`, { token: 'owner-token', method: 'PUT', body: form });
  assert.equal(status, 200, JSON.stringify(body));
  const packSizesByLabel = Object.fromEntries(body.product.packSizes.map((packSize) => [packSize.label, packSize]));
  assert.equal(packSizesByLabel['1 L'].price, 149);
  assert.equal(packSizesByLabel['1 L'].stock, 40, 'stock is only changed through stock adjustments');
  assert.equal(packSizesByLabel['5 L'].active, false, 'removed pack size is hidden, not deleted');
  assert.equal(packSizesByLabel['15 L tin'].stock, 6);

  const customerView = await callApi(`/api/products/${sunflowerOil.id}`);
  assert.deepEqual(customerView.body.product.packSizes.map((packSize) => packSize.label), ['1 L', '15 L tin']);
});

test('stock can be added and removed but never below zero', { skip }, async () => {
  const packOneId = sunflowerOil.packSizes[0].id;
  const adjust = (quantityChange) => callApi(`/api/admin/pack-sizes/${packOneId}/stock-adjustments`, {
    token: 'packer-token', method: 'POST', body: { quantityChange },
  });
  assert.equal((await adjust(10)).body.stock, 50);
  assert.equal((await adjust(-48)).body.stock, 2);
  assert.equal((await adjust(-3)).status, 400);
  assert.equal((await adjust(1.5)).status, 400);
  const stockList = await callApi('/api/admin/stock', { token: 'packer-token' });
  const packOneItem = stockList.body.stockItems.find((item) => item.packSizeId === packOneId);
  assert.equal(packOneItem.lowStock, true);

  const lowOnly = await callApi('/api/admin/stock?status=low', { token: 'packer-token' });
  assert.ok(lowOnly.body.stockItems.length > 0);
  assert.ok(lowOnly.body.stockItems.every((item) => item.lowStock), 'status=low shows only low-stock items');
  const searched = await callApi('/api/admin/stock?search=sunflower', { token: 'packer-token' });
  assert.ok(searched.body.stockItems.every((item) => item.productName.includes('Sunflower')));
});

test('photo upload accepts real images only', { skip }, async () => {
  const jpegBytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
  const upload = (rawBody, contentType) => callApi(`/api/admin/products/${sunflowerOil.id}/image`, {
    token: 'owner-token', method: 'POST', rawBody, contentType,
  });
  const fakeJpeg = await upload(Buffer.from('this is not an image at all'), 'image/jpeg');
  assert.equal(fakeJpeg.status, 400);
  const realJpeg = await upload(jpegBytes, 'image/jpeg');
  assert.equal(realJpeg.status, 200, JSON.stringify(realJpeg.body));
  assert.match(realJpeg.body.product.imageUrl, /^https:\/\/storage\.test\/products\//);
  assert.equal(fakeProductImageStorage.uploadedImages.length, 1);
});

const bulkImportCsv = [
  'Category,Product name,Brand,Pack size,Maximum retail price (MRP),Price,Stock,Low stock alert,Best before (YYYY-MM-DD),Manufacturer,Description',
  'Atta & Flours,Shudh Chakki Atta,Aashirvaad,5 kg,295,275,20,4,2027-01-31,ITC,',
  'Atta & Flours,Shudh Chakki Atta,Aashirvaad,10 kg,560,520,18,,,ITC,',
  '"Oils & Ghee",Fortune Sunflower Oil,Fortune,1 L,180,150,25,,,,"Light, healthy ""refined"" oil"',
].join('\r\n');

test('bulk import creates new products and updates existing pack sizes', { skip }, async () => {
  const { status, body } = await callApi('/api/admin/products/bulk-import', {
    token: 'owner-token', method: 'POST', rawBody: bulkImportCsv, contentType: 'text/csv',
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.deepEqual(body.summary, { productsCreated: 1, packSizesCreated: 2, packSizesUpdated: 1 });
  const oil = (await callApi(`/api/admin/products/${sunflowerOil.id}`, { token: 'owner-token' })).body.product;
  const packOne = oil.packSizes.find((packSize) => packSize.label === '1 L');
  assert.equal(packOne.price, 150);
  assert.equal(packOne.stock, 25, 'the stock column replaces the count');
  assert.equal(oil.description, 'Light, healthy "refined" oil');
});

test('bulk import with any bad row saves nothing and lists every problem', { skip }, async () => {
  const badCsv = [
    'Category,Product name,Brand,Pack size,MRP,Price,Stock',
    'Atta & Flours,Besan,Rajdhani,500 g,70,62,24',
    'Snacks,Chips,Lays,50 g,20,20,10',
    'Rice,Basmati Rice,India Gate,5 kg,850,900,4',
    'Rice,Basmati Rice,India Gate,1 kg,180,170,',
  ].join('\n');
  const { status, body } = await callApi('/api/admin/products/bulk-import', {
    token: 'owner-token', method: 'POST', rawBody: badCsv, contentType: 'text/csv',
  });
  assert.equal(status, 400);
  assert.deepEqual(body.problems.map((problem) => problem.rowNumber), [3, 4, 5]);
  assert.equal((await callApi('/api/products?search=besan')).body.products.length, 0, 'valid rows were not saved either');
});

test('notify me works for coming-soon categories only, after an address is saved', { skip }, async () => {
  const fruitsId = categoryIds['Fruits & Vegetables'];
  const beforeAddress = await callApi('/api/account/notify-me', { token: 'customer-token', method: 'POST', body: { categoryId: fruitsId } });
  assert.equal(beforeAddress.status, 400);

  const { body: zonesBody } = await callApi('/api/zones');
  const society = zonesBody.zones.find((zone) => zone.type === 'society');
  await callApi('/api/account/profile', { token: 'customer-token', method: 'PUT', body: {
    name: 'Riya', phone: '9876543210', zoneId: society.id, towerId: society.towers[0].id, flatNumber: '101',
  } });
  const notified = await callApi('/api/account/notify-me', { token: 'customer-token', method: 'POST', body: { categoryId: fruitsId } });
  assert.deepEqual(notified.body.notifyMeCategoryIds, [fruitsId]);
  const alreadyAvailable = await callApi('/api/account/notify-me', {
    token: 'customer-token', method: 'POST', body: { categoryId: categoryIds.Rice },
  });
  assert.equal(alreadyAvailable.status, 400);
  assert.deepEqual((await callApi('/api/account', { token: 'customer-token' })).body.notifyMeCategoryIds, [fruitsId]);
});
