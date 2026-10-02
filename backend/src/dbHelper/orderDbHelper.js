const insertOrderQuery = `
  insert into orders (customer_id, zone_id, zone_type, slot_id, delivery_date, customer_name, customer_phone,
                      tower_name, flat_number, house_number, street, landmark, floor, latitude, longitude,
                      items_total, delivery_charge, total)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
  returning id, order_number`;

const insertOrderItemsQuery = `
  insert into order_items (order_id, pack_size_id, product_name, pack_label, quantity, unit_price)
  select $1, item.pack_size_id, item.product_name, item.pack_label, item.quantity, item.unit_price
  from unnest($2::bigint[], $3::text[], $4::text[], $5::int[], $6::numeric[])
    as item(pack_size_id, product_name, pack_label, quantity, unit_price)`;

const customerOrdersQuery = `
  select placed.id, placed.order_number, placed.status, placed.delivery_date, slot.name as slot_name,
         to_char(slot.start_time, 'HH24:MI') as start_time, to_char(slot.end_time, 'HH24:MI') as end_time,
         placed.customer_name, placed.customer_phone, zone.name as zone_name, placed.zone_type,
         placed.tower_name, placed.flat_number, placed.house_number, placed.street, placed.landmark, placed.floor,
         placed.items_total, placed.delivery_charge, placed.total, placed.payment_method, placed.payment_status,
         placed.cancel_reason, placed.created_at,
         (select json_agg(json_build_object(
                   'packSizeId', item.pack_size_id, 'productName', item.product_name, 'packLabel', item.pack_label,
                   'quantity', item.quantity, 'unitPrice', item.unit_price) order by item.id)
          from order_items item where item.order_id = placed.id) as items
  from orders placed
  join slots slot on slot.id = placed.slot_id
  join zones zone on zone.id = placed.zone_id
  where placed.customer_id = $1 and ($2::bigint is null or placed.order_number = $2)
  order by placed.created_at desc
  limit 50`;

function toCustomerOrder(row) {
  return {
    orderNumber: row.order_number,
    status: row.status,
    deliveryDate: row.delivery_date,
    slot: { name: row.slot_name, startTime: row.start_time, endTime: row.end_time },
    address: {
      customerName: row.customer_name, customerPhone: row.customer_phone, zoneName: row.zone_name,
      zoneType: row.zone_type, towerName: row.tower_name, flatNumber: row.flat_number,
      houseNumber: row.house_number, street: row.street, landmark: row.landmark, floor: row.floor,
    },
    itemsTotal: row.items_total,
    deliveryCharge: row.delivery_charge,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at.toISOString(),
    items: row.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
  };
}

// order: { customerId, zone, slotId, deliveryDate, address, itemsTotal, deliveryCharge, total }.
// Returns { id, orderNumber }.
export async function insertOrder(executor, order) {
  const { address } = order;
  const result = await executor.query(insertOrderQuery, [
    order.customerId, order.zone.id, order.zone.type, order.slotId, order.deliveryDate,
    address.name, address.phone, address.towerName, address.flatNumber, address.houseNumber,
    address.street, address.landmark, address.floor, address.latitude, address.longitude,
    order.itemsTotal, order.deliveryCharge, order.total,
  ]);
  return { id: result.rows[0].id, orderNumber: result.rows[0].order_number };
}

// lines: [{ packSizeId, productName, packLabel, quantity, unitPrice }]
export async function insertOrderItems(executor, orderId, lines) {
  await executor.query(insertOrderItemsQuery, [
    orderId,
    lines.map((line) => line.packSizeId),
    lines.map((line) => line.productName),
    lines.map((line) => line.packLabel),
    lines.map((line) => line.quantity),
    lines.map((line) => line.unitPrice),
  ]);
}

// Newest first, at most 50.
export async function findCustomerOrders(executor, customerId) {
  const result = await executor.query(customerOrdersQuery, [customerId, null]);
  return result.rows.map(toCustomerOrder);
}

export async function findCustomerOrder(executor, customerId, orderNumber) {
  const result = await executor.query(customerOrdersQuery, [customerId, orderNumber]);
  return result.rows[0] ? toCustomerOrder(result.rows[0]) : null;
}

// Call inside a transaction. Returns { id, status, items: [{ packSizeId, quantity }] } or null.
export async function lockCustomerOrder(executor, customerId, orderNumber) {
  const result = await executor.query(
    'select id, status from orders where customer_id = $1 and order_number = $2 for update',
    [customerId, orderNumber],
  );
  const order = result.rows[0];
  if (!order) return null;
  const items = await executor.query('select pack_size_id, quantity from order_items where order_id = $1', [order.id]);
  return {
    id: order.id,
    status: order.status,
    items: items.rows.map((item) => ({ packSizeId: item.pack_size_id, quantity: item.quantity })),
  };
}

export async function markOrderCancelled(executor, orderId, reason) {
  await executor.query(
    "update orders set status = 'cancelled', cancel_reason = $2, updated_at = now() where id = $1",
    [orderId, reason],
  );
}
