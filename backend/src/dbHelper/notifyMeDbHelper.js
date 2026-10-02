const notifyMeCategoryIdsQuery = `
  select notify.category_id
  from notify_me notify
  join customers customer on customer.id = notify.customer_id
  where customer.user_id = $1
  order by notify.category_id`;

// Records interest in a coming-soon category, with the customer's zone.
// Does nothing for categories that are already available.
const saveNotifyMeQuery = `
  insert into notify_me (customer_id, category_id, zone_id)
  select customer.id, category.id, customer.zone_id
  from customers customer, categories category
  where customer.user_id = $1 and category.id = $2 and category.coming_soon
  on conflict (customer_id, category_id) do nothing`;

export async function findNotifyMeCategoryIds(executor, userId) {
  const result = await executor.query(notifyMeCategoryIdsQuery, [userId]);
  return result.rows.map((row) => row.category_id);
}

export async function saveNotifyMe(executor, userId, categoryId) {
  await executor.query(saveNotifyMeQuery, [userId, categoryId]);
}
