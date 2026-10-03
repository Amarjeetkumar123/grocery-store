// Money collected at the door, and cash riders hand over to the owner.
// All dates here are Indian dates.

const collectedOn = "(payment.collected_at at time zone 'Asia/Kolkata')::date";

// One payment per order (the database refuses a second one).
export async function insertPayment(executor, { orderId, method, amount, collectedBy }) {
  await executor.query(
    'insert into payments (order_id, method, amount, collected_by) values ($1, $2, $3, $4)',
    [orderId, method, amount, collectedBy],
  );
  await executor.query(
    "update orders set payment_method = $2, payment_status = 'paid', updated_at = now() where id = $1",
    [orderId, method],
  );
}

// Cash collected by this person and not yet handed over, all days together.
export async function findCashInHand(executor, staffId) {
  const result = await executor.query(
    `select coalesce((select sum(amount) from payments where collected_by = $1 and method = 'cash'), 0)
          - coalesce((select sum(amount) from cash_handovers where rider_id = $1), 0) as cash_in_hand`,
    [staffId],
  );
  return result.rows[0].cash_in_hand;
}

const dailyCollectionsQuery = `
  select member.id, member.name, member.role,
         coalesce(sum(payment.amount) filter (where payment.method = 'cash' and ${collectedOn} = $1), 0) as cash_today,
         coalesce(sum(payment.amount) filter (where payment.method = 'upi' and ${collectedOn} = $1), 0) as upi_today,
         count(payment.id) filter (where ${collectedOn} = $1) as payments_today,
         coalesce(sum(payment.amount) filter (where payment.method = 'cash'), 0)
           - coalesce((select sum(handover.amount) from cash_handovers handover where handover.rider_id = member.id), 0) as cash_in_hand
  from staff member
  left join payments payment on payment.collected_by = member.id
  group by member.id
  having count(payment.id) > 0 or (member.role = 'rider' and member.active)
  order by member.name`;

// Everyone who collected money (riders, or the owner at the counter).
export async function findDailyCollections(executor, date) {
  const result = await executor.query(dailyCollectionsQuery, [date]);
  return result.rows.map((row) => ({
    staffId: row.id,
    name: row.name,
    role: row.role,
    cashToday: row.cash_today,
    upiToday: row.upi_today,
    paymentsToday: row.payments_today,
    cashInHand: row.cash_in_hand,
  }));
}

export async function insertCashHandover(executor, { staffId, date, amount, receivedBy }) {
  await executor.query(
    'insert into cash_handovers (rider_id, handover_date, amount, received_by) values ($1, $2, $3, $4)',
    [staffId, date, amount, receivedBy],
  );
}

// Orders for the day that are not delivered or cancelled yet, so not paid.
export async function findUnpaidOrders(executor, date) {
  const result = await executor.query(
    `select placed.order_number, placed.status, placed.total, placed.customer_name, rider.name as rider_name
     from orders placed left join staff rider on rider.id = placed.rider_id
     where placed.delivery_date = $1 and placed.payment_status = 'unpaid' and placed.status <> 'cancelled'
     order by placed.order_number`,
    [date],
  );
  return result.rows.map((row) => ({
    orderNumber: row.order_number, status: row.status, total: row.total, customerName: row.customer_name, riderName: row.rider_name,
  }));
}
