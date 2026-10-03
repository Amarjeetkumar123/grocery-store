import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upiPaymentLink } from './upiPaymentLink.js';

test('the UPI link carries the store, the exact amount and the order number', () => {
  const link = upiPaymentLink({ upiId: 'store@okhdfcbank', storeName: 'Grocery Store', amount: 1566.5, orderNumber: 1023 });
  assert.equal(link, 'upi://pay?pa=store%40okhdfcbank&pn=Grocery%20Store&am=1566.50&cu=INR&tn=Order%201023');
});
