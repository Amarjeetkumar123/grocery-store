// Browser push subscriptions. One browser = one endpoint; it belongs to
// whoever signed in on that browser most recently.

const toSubscription = (row) => ({ endpoint: row.endpoint, keys: row.keys });

export async function saveSubscription(executor, userId, { endpoint, keys }) {
  await executor.query(
    `insert into push_subscriptions (user_id, endpoint, keys) values ($1, $2, $3)
     on conflict (endpoint) do update set user_id = excluded.user_id, keys = excluded.keys`,
    [userId, endpoint, keys],
  );
}

// userId given: only that user's own subscription is removed.
export async function deleteSubscription(executor, endpoint, userId = null) {
  await executor.query('delete from push_subscriptions where endpoint = $1 and ($2::uuid is null or user_id = $2)', [endpoint, userId]);
}

export async function findSubscriptionsForStaffRoles(executor, roles) {
  const result = await executor.query(
    `select subscription.endpoint, subscription.keys from push_subscriptions subscription
     join staff member on member.user_id = subscription.user_id
     where member.active and member.role = any($1::text[])`,
    [roles],
  );
  return result.rows.map(toSubscription);
}

export async function findSubscriptionsForStaffMember(executor, staffId) {
  const result = await executor.query(
    `select subscription.endpoint, subscription.keys from push_subscriptions subscription
     join staff member on member.user_id = subscription.user_id where member.id = $1 and member.active`,
    [staffId],
  );
  return result.rows.map(toSubscription);
}

export async function findSubscriptionsForOrderCustomer(executor, orderNumber) {
  const result = await executor.query(
    `select subscription.endpoint, subscription.keys from push_subscriptions subscription
     join customers customer on customer.user_id = subscription.user_id
     join orders placed on placed.customer_id = customer.id where placed.order_number = $1`,
    [orderNumber],
  );
  return result.rows.map(toSubscription);
}
