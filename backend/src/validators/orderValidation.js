import { readPositiveInteger } from './commonValidation.js';
import { readOptionalDate } from './productValidation.js';

export const maximumQuantityPerItem = 20;
const maximumCartLines = 30;

// input: [{ packSizeId, quantity }]. The same pack twice is added together.
// Returns { items } or { errorMessage }.
export function readCartItems(input) {
  if (!Array.isArray(input) || input.length === 0) return { errorMessage: 'Your cart is empty.' };
  if (input.length > maximumCartLines) return { errorMessage: `A cart can hold at most ${maximumCartLines} items.` };

  const quantityByPackSizeId = new Map();
  for (const item of input) {
    const packSizeId = readPositiveInteger(item?.packSizeId);
    const quantity = readPositiveInteger(item?.quantity);
    if (!packSizeId || !quantity) return { errorMessage: 'Your cart has an item we could not read. Please add it again.' };
    quantityByPackSizeId.set(packSizeId, (quantityByPackSizeId.get(packSizeId) ?? 0) + quantity);
  }
  const items = [...quantityByPackSizeId].map(([packSizeId, quantity]) => ({ packSizeId, quantity }));
  if (items.some((item) => item.quantity > maximumQuantityPerItem)) {
    return { errorMessage: `You can order at most ${maximumQuantityPerItem} of one item.` };
  }
  return { items };
}

// body: { items, slotId, deliveryDate: "2026-10-04" }. Returns { order } or { errorMessage }.
export function readPlaceOrderRequest(body) {
  const { items, errorMessage } = readCartItems(body.items);
  if (errorMessage) return { errorMessage };
  const slotId = readPositiveInteger(body.slotId);
  const { date: deliveryDate } = readOptionalDate(body.deliveryDate);
  if (!slotId || !deliveryDate) return { errorMessage: 'Please choose a delivery slot.' };
  return { order: { items, slotId, deliveryDate } };
}
