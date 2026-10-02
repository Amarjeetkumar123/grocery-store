import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart } from '../src/services/cartPricing.js';
import { readCartItems } from '../src/validators/orderValidation.js';

const zone = { minimumOrderValue: 100, deliveryCharge: 30, freeDeliveryAbove: 500 };
const packSize = (id, price, stock) => ({ id, price, stock, available: true, label: '1 kg', productName: `Item ${id}` });

test('totals are added in paise, so 33.33 x 3 is exactly 99.99', () => {
  const cart = priceCart([{ packSizeId: 1, quantity: 3 }], [packSize(1, 33.33, 10)], zone);
  assert.equal(cart.itemsTotal, 99.99);
  assert.equal(cart.total, 129.99);
  assert.equal(cart.meetsMinimum, false);
});

test('lines with a problem do not count, and missing packs are reported', () => {
  const cart = priceCart(
    [{ packSizeId: 1, quantity: 2 }, { packSizeId: 2, quantity: 5 }, { packSizeId: 3, quantity: 1 }],
    [packSize(1, 300, 10), packSize(2, 50, 4)],
    zone,
  );
  assert.equal(cart.itemsTotal, 600);
  assert.equal(cart.deliveryCharge, 0);
  assert.equal(cart.lines[1].problem, 'Not enough stock. Please lower the quantity.');
  assert.deepEqual(cart.removedPackSizeIds, [3]);
  assert.equal(cart.hasProblems, true);
});

test('cart items are merged and limited', () => {
  assert.deepEqual(readCartItems([{ packSizeId: 1, quantity: 2 }, { packSizeId: '1', quantity: 3 }]).items, [{ packSizeId: 1, quantity: 5 }]);
  assert.ok(readCartItems([{ packSizeId: 1, quantity: 21 }]).errorMessage);
  assert.ok(readCartItems([{ packSizeId: 1, quantity: 0 }]).errorMessage);
  assert.ok(readCartItems([]).errorMessage);
});
