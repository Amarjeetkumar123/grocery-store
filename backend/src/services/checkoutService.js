import { withTransaction } from '../dbHelper/databaseConnection.js';
import { findCustomerWithProfileByUserId } from '../dbHelper/customerDbHelper.js';
import { insertOrder, insertOrderItems } from '../dbHelper/orderDbHelper.js';
import { adjustPackSizeStock, findPackSizesForCart } from '../dbHelper/packSizeDbHelper.js';
import { findUpcomingSlotOccurrences, lockSlotOccurrence } from '../dbHelper/slotDbHelper.js';
import { findZoneDeliverySettings } from '../dbHelper/zoneDbHelper.js';
import { readCartItems, readPlaceOrderRequest } from '../validators/orderValidation.js';
import { priceCart } from './cartPricing.js';
import { checkDeliveryDistance } from './deliveryDistance.js';
import { ServiceError } from './serviceError.js';

// Customers can book slots from today up to this many days ahead.
const bookingWindowDays = 7;

async function requireCustomer(executor, user) {
  const customer = await findCustomerWithProfileByUserId(executor, user.id);
  if (!customer) throw ServiceError.badRequest('Please save your delivery address first.');
  if (customer.profile.blocked) throw ServiceError.forbidden('Your account is on hold. Please call the store.');
  return customer;
}

async function requireDeliveryZone(executor, profile) {
  const zone = await findZoneDeliverySettings(executor, profile.zoneId);
  if (!zone?.active) throw ServiceError.conflict('We are not delivering to your area right now.');
  return zone;
}

function toCartResponse(cart, productImageStorage) {
  const lines = cart.lines.map(({ imagePath, ...line }) => ({ ...line, imageUrl: productImageStorage.publicUrlFor(imagePath) }));
  return { ...cart, lines };
}

// body: { items: [{ packSizeId, quantity }] } -> current prices, totals and problems.
async function quoteCart({ database, productImageStorage }, user, body) {
  const { items, errorMessage } = readCartItems(body.items);
  if (errorMessage) throw ServiceError.badRequest(errorMessage);
  const { profile } = await requireCustomer(database, user);
  const zone = await requireDeliveryZone(database, profile);
  const packSizes = await findPackSizesForCart(database, items.map((item) => item.packSizeId));
  return { cart: toCartResponse(priceCart(items, packSizes, zone), productImageStorage) };
}

async function listDeliverySlots({ database }, user) {
  const { profile } = await requireCustomer(database, user);
  return { slots: await findUpcomingSlotOccurrences(database, profile.zoneId, bookingWindowDays) };
}

async function checkSlotIsBookable(client, zoneId, order) {
  const slot = await lockSlotOccurrence(client, {
    slotId: order.slotId, zoneId, deliveryDate: order.deliveryDate, numberOfDays: bookingWindowDays,
  });
  if (!slot?.open) throw ServiceError.conflict('That delivery slot has closed. Please choose another.', { slotChanged: true });
  if (slot.full) throw ServiceError.conflict('That delivery slot just filled up. Please choose another.', { slotChanged: true });
}

async function priceLockedCart(client, items, zone) {
  const packSizes = await findPackSizesForCart(client, items.map((item) => item.packSizeId), { lockRows: true });
  const cart = priceCart(items, packSizes, zone);
  if (cart.hasProblems) throw ServiceError.conflict('Some items in your cart have changed. Please check your cart.', { cartChanged: true });
  if (!cart.meetsMinimum) throw ServiceError.badRequest(`The minimum order for your area is ₹${zone.minimumOrderValue}.`);
  return cart;
}

// The address is copied, so a later profile change never moves this order.
function addressCopy(profile) {
  const { name, phone, towerName, flatNumber, houseNumber, street, landmark, floor, latitude, longitude } = profile;
  return { name, phone, towerName, flatNumber, houseNumber, street, landmark, floor, latitude, longitude };
}

async function saveOrder(client, { customerId, profile }, zone, order, cart) {
  for (const line of cart.lines) {
    // The rows are locked and were checked above, so this cannot fail.
    if ((await adjustPackSizeStock(client, line.packSizeId, -line.quantity)) === null) throw new Error('Stock changed under lock');
  }
  const saved = await insertOrder(client, {
    customerId, zone, slotId: order.slotId, deliveryDate: order.deliveryDate, address: addressCopy(profile),
    itemsTotal: cart.itemsTotal, deliveryCharge: cart.deliveryCharge, total: cart.total,
  });
  await insertOrderItems(client, saved.id, cart.lines);
  return saved;
}

// One transaction: zone, distance, slot, stock, prices, then save. Any
// failure saves nothing and the customer sees why.
async function placeOrder({ database }, user, body) {
  const { order, errorMessage } = readPlaceOrderRequest(body);
  if (errorMessage) throw ServiceError.badRequest(errorMessage);
  const saved = await withTransaction(database, async (client) => {
    const customer = await requireCustomer(client, user);
    const zone = await requireDeliveryZone(client, customer.profile);
    if (customer.profile.latitude !== null) {
      const distanceError = await checkDeliveryDistance(client, customer.profile.latitude, customer.profile.longitude);
      if (distanceError) throw ServiceError.badRequest(`${distanceError} Please update your address.`);
    }
    await checkSlotIsBookable(client, zone.id, order);
    const cart = await priceLockedCart(client, order.items, zone);
    return saveOrder(client, customer, zone, order, cart);
  });
  return { orderNumber: saved.orderNumber };
}

export function createCheckoutService(dependencies) {
  return {
    quoteCart: (user, body) => quoteCart(dependencies, user, body),
    listDeliverySlots: (user) => listDeliverySlots(dependencies, user),
    placeOrder: (user, body) => placeOrder(dependencies, user, body),
  };
}
