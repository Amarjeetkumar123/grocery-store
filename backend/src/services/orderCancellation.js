import { markOrderCancelled } from '../dbHelper/orderDbHelper.js';
import { adjustPackSizeStock } from '../dbHelper/packSizeDbHelper.js';

// order comes from lockOrder (inside a transaction). The stock goes back
// on the shelf and the order is marked cancelled, together.
export async function cancelLockedOrder(client, order, reason) {
  for (const item of order.items) await adjustPackSizeStock(client, item.packSizeId, item.quantity);
  await markOrderCancelled(client, order.id, reason);
}
