import { orderItemsJson, toCustomerOrder } from './orderDbHelper.js';

// orderFilter comes from filters/orderFilters.js.
const adminOrdersQuery = (whereClause, ordering, pagePlaceholders) => `
  select placed.id, placed.order_number, placed.status, placed.delivery_date, placed.created_at,
         slot.id as slot_id, slot.name as slot_name,
         to_char(slot.start_time, 'HH24:MI') as start_time, to_char(slot.end_time, 'HH24:MI') as end_time,
         zone.id as zone_id, zone.name as zone_name, placed.zone_type,
         placed.customer_id, customer.phone_confirmed, customer.blocked,
         not exists (select 1 from orders earlier
                     where earlier.customer_id = placed.customer_id and earlier.created_at < placed.created_at) as first_order,
         placed.customer_name, placed.customer_phone, placed.tower_name, placed.flat_number, placed.house_number,
         placed.street, placed.landmark, placed.floor, placed.latitude, placed.longitude,
         placed.items_total, placed.delivery_charge, placed.total, placed.payment_method, placed.payment_status,
         placed.cancel_reason, rider.id as rider_id, rider.name as rider_name, ${orderItemsJson} as items
  from orders placed
  join slots slot on slot.id = placed.slot_id
  join zones zone on zone.id = placed.zone_id
  join customers customer on customer.id = placed.customer_id
  left join staff rider on rider.id = placed.rider_id
  ${whereClause}
  order by ${ordering}
  limit ${pagePlaceholders}`;

const oldestFirst = 'placed.delivery_date, slot.start_time, placed.created_at';
const newestFirst = 'placed.delivery_date desc, slot.start_time desc, placed.created_at desc';

function toAdminOrder(row) {
  const order = toCustomerOrder(row);
  return {
    ...order,
    slot: { id: row.slot_id, ...order.slot },
    zoneId: row.zone_id,
    address: { ...order.address, latitude: row.latitude, longitude: row.longitude },
    customer: { id: row.customer_id, phoneConfirmed: row.phone_confirmed, blocked: row.blocked, firstOrder: row.first_order },
    rider: row.rider_id ? { id: row.rider_id, name: row.rider_name } : null,
  };
}

// page: { limit, offset, newestFirst }; without it, the first 1000 oldest first.
export async function findAdminOrders(executor, orderFilter, { limit = 1000, offset = 0, newestFirst: newest = false } = {}) {
  const count = orderFilter.values.length;
  const query = adminOrdersQuery(orderFilter.whereClause, newest ? newestFirst : oldestFirst, `$${count + 1} offset $${count + 2}`);
  const result = await executor.query(query, [...orderFilter.values, limit, offset]);
  return result.rows.map(toAdminOrder);
}

// For a board filter: { new: 4, confirmed: 2, … } over every page.
export async function findOrderStatusCounts(executor, orderFilter) {
  const result = await executor.query(`
    select placed.status, count(*)::int as orders
    from orders placed join slots slot on slot.id = placed.slot_id
    ${orderFilter.whereClause}
    group by placed.status`, orderFilter.values);
  return Object.fromEntries(result.rows.map((row) => [row.status, row.orders]));
}

// Zones and slot times that have orders in a date range, for the board's dropdowns.
export async function findBoardFilterOptions(executor, orderFilter) {
  const result = await executor.query(`
    select distinct placed.zone_id, zone.name as zone_name,
           to_char(slot.start_time, 'HH24:MI') as start_time, to_char(slot.end_time, 'HH24:MI') as end_time
    from orders placed join slots slot on slot.id = placed.slot_id join zones zone on zone.id = placed.zone_id
    ${orderFilter.whereClause}`, orderFilter.values);
  const zones = new Map(result.rows.map((row) => [row.zone_id, { id: row.zone_id, name: row.zone_name }]));
  const timeWindows = new Map(result.rows.map((row) => [`${row.start_time}-${row.end_time}`, { startTime: row.start_time, endTime: row.end_time }]));
  return {
    zones: [...zones.values()].sort((first, second) => first.name.localeCompare(second.name)),
    timeWindows: [...timeWindows.values()].sort((first, second) => first.startTime.localeCompare(second.startTime)),
  };
}

export async function updateOrderStatus(executor, orderId, status) {
  await executor.query('update orders set status = $2, updated_at = now() where id = $1', [orderId, status]);
}

// Delivered and cancelled orders keep their rider. Returns the order numbers changed.
export async function assignRiderToOrders(executor, orderNumbers, riderId) {
  const result = await executor.query(
    `update orders set rider_id = $2, updated_at = now()
     where order_number = any($1::bigint[]) and status not in ('delivered', 'cancelled')
     returning order_number`,
    [orderNumbers, riderId],
  );
  return result.rows.map((row) => row.order_number);
}

// Days from fromDate on that have orders still to deliver: [{ date: "2026-10-04", orders: 3 }].
export async function findUpcomingOrderDays(executor, fromDate) {
  const result = await executor.query(`
    select delivery_date::text as date, count(*)::int as orders
    from orders
    where delivery_date >= $1 and status not in ('cancelled', 'delivered')
    group by delivery_date
    order by delivery_date
    limit 14`, [fromDate]);
  return result.rows;
}
