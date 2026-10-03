// Delivery slots. A slot repeats on its days; one "occurrence" is a slot
// on one delivery date. All dates and cutoffs use Indian time.

const slotColumns = `
  slot.id, slot.zone_id, slot.name, slot.days, to_char(slot.start_time, 'HH24:MI') as start_time,
  to_char(slot.end_time, 'HH24:MI') as end_time, slot.cutoff_minutes_before, slot.max_orders, slot.active`;

// Moment the slot closes on a delivery date ($date), as a timestamp.
const cutoffAt = (dateExpression) => `
  ((${dateExpression} + slot.start_time) at time zone 'Asia/Kolkata')
    - make_interval(mins => slot.cutoff_minutes_before)`;

const ordersTaken = (dateExpression) => `
  (select count(*) from orders taken
   where taken.slot_id = slot.id and taken.delivery_date = ${dateExpression} and taken.status <> 'cancelled')`;

const upcomingOccurrencesQuery = `
  with delivery_days as (
    select (now() at time zone 'Asia/Kolkata')::date + day_offset as delivery_date
    from generate_series(0, $2::int - 1) as day_offset
  )
  select slot.id as slot_id, slot.name, delivery_days.delivery_date,
         to_char(slot.start_time, 'HH24:MI') as start_time, to_char(slot.end_time, 'HH24:MI') as end_time,
         ${cutoffAt('delivery_days.delivery_date')} as cutoff_at,
         slot.max_orders, ${ordersTaken('delivery_days.delivery_date')} as orders_taken
  from slots slot
  cross join delivery_days
  where slot.zone_id = $1 and slot.active
    and extract(dow from delivery_days.delivery_date)::smallint = any(slot.days)
    and ${cutoffAt('delivery_days.delivery_date')} > now()
  order by delivery_days.delivery_date, slot.start_time`;

// Locks the slot row, so two customers can't both take its last place.
const lockSlotQuery = `
  select slot.id, slot.name, to_char(slot.start_time, 'HH24:MI') as start_time,
         to_char(slot.end_time, 'HH24:MI') as end_time, slot.max_orders,
         (slot.active
          and extract(dow from $3::date)::smallint = any(slot.days)
          and $3::date <= (now() at time zone 'Asia/Kolkata')::date + $4::int
          and ${cutoffAt('$3::date')} > now()) as open
  from slots slot
  where slot.id = $1 and slot.zone_id = $2
  for update of slot`;

const countOrdersTakenQuery = `select ${ordersTaken('$2::date')} as orders_taken from slots slot where slot.id = $1`;

function toSlot(row) {
  return {
    id: row.id,
    zoneId: row.zone_id,
    name: row.name,
    days: row.days,
    startTime: row.start_time,
    endTime: row.end_time,
    cutoffMinutesBefore: row.cutoff_minutes_before,
    maximumOrders: row.max_orders,
    active: row.active,
  };
}

// Open slots for a zone over the next numberOfDays days, today included.
export async function findUpcomingSlotOccurrences(executor, zoneId, numberOfDays) {
  const result = await executor.query(upcomingOccurrencesQuery, [zoneId, numberOfDays]);
  return result.rows.map((row) => ({
    slotId: row.slot_id,
    name: row.name,
    deliveryDate: row.delivery_date,
    startTime: row.start_time,
    endTime: row.end_time,
    cutoffAt: row.cutoff_at.toISOString(),
    placesLeft: Math.max(row.max_orders - row.orders_taken, 0),
  }));
}

// Call inside a transaction. Returns null when the slot is not in this zone.
// The orders are counted in a second statement on purpose: a statement that
// waited for the lock still sees the data from before it waited, so it
// would miss the order that was just placed by whoever held the lock.
export async function lockSlotOccurrence(executor, { slotId, zoneId, deliveryDate, numberOfDays }) {
  const result = await executor.query(lockSlotQuery, [slotId, zoneId, deliveryDate, numberOfDays - 1]);
  const row = result.rows[0];
  if (!row) return null;
  const counted = await executor.query(countOrdersTakenQuery, [slotId, deliveryDate]);
  row.orders_taken = counted.rows[0].orders_taken;
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    open: row.open,
    full: row.orders_taken >= row.max_orders,
  };
}

export async function findAllSlots(executor) {
  const result = await executor.query(`select ${slotColumns} from slots slot order by slot.start_time, slot.name`);
  return result.rows.map(toSlot);
}

export async function insertSlot(executor, zoneId, slot) {
  const result = await executor.query(
    `insert into slots (zone_id, name, days, start_time, end_time, cutoff_minutes_before, max_orders, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [zoneId, slot.name, slot.days, slot.startTime, slot.endTime, slot.cutoffMinutesBefore, slot.maximumOrders, slot.active],
  );
  return result.rows[0].id;
}

// Returns false when there is no such slot.
export async function updateSlot(executor, slotId, slot) {
  const result = await executor.query(
    `update slots set name = $2, days = $3, start_time = $4, end_time = $5,
                      cutoff_minutes_before = $6, max_orders = $7, active = $8
     where id = $1`,
    [slotId, slot.name, slot.days, slot.startTime, slot.endTime, slot.cutoffMinutesBefore, slot.maximumOrders, slot.active],
  );
  return result.rowCount > 0;
}

// Every active zone with its slots running on deliveryDate and how full each
// is; a zone with no slot that day comes back once with slotId null.
const slotLoadQuery = `
  select zone.id as zone_id, zone.name as zone_name, zone.type as zone_type,
         slot.id as slot_id, to_char(slot.start_time, 'HH24:MI') as start_time,
         to_char(slot.end_time, 'HH24:MI') as end_time, slot.max_orders,
         count(taken.id) filter (where taken.status <> 'cancelled')::int as orders_taken,
         count(taken.id) filter (where taken.status = 'new')::int as orders_waiting
  from zones zone
  left join slots slot on slot.zone_id = zone.id and slot.active
    and extract(dow from $1::date)::smallint = any(slot.days)
  left join orders taken on taken.slot_id = slot.id and taken.delivery_date = $1::date
  where zone.active
  group by zone.id, slot.id
  order by zone.name, slot.start_time`;

export async function findSlotLoadForDay(executor, deliveryDate) {
  const result = await executor.query(slotLoadQuery, [deliveryDate]);
  return result.rows.map((row) => ({
    zoneId: row.zone_id,
    zoneName: row.zone_name,
    zoneType: row.zone_type,
    slotId: row.slot_id,
    startTime: row.start_time,
    endTime: row.end_time,
    maximumOrders: row.max_orders,
    ordersTaken: row.orders_taken,
    ordersWaiting: row.orders_waiting,
  }));
}
