// reviewFilter comes from filters/reviewFilters.js.

const reviewsFrom = `
  from product_reviews review
  join customers customer on customer.id = review.customer_id
  left join zones zone on zone.id = customer.zone_id`;

function toReview(row) {
  return {
    id: row.id,
    rating: row.rating,
    tags: row.tags,
    body: row.body,
    packLabel: row.pack_label,
    customerName: row.customer_name,
    zoneName: row.zone_name,
    createdAt: row.created_at.toISOString(),
    edited: row.updated_at.getTime() - row.created_at.getTime() > 60000,
  };
}

// Shown reviews of one product, as { average, ratingCount, reviewCount, starCounts: { 5: 74, ... 1: 7 } }.
export async function findReviewSummary(executor, productId) {
  const result = await executor.query(
    `select round(avg(rating), 1) as average, count(*)::int as rating_count,
            count(*) filter (where coalesce(body, '') <> '')::int as review_count,
            ${[5, 4, 3, 2, 1].map((stars) => `count(*) filter (where rating = ${stars})::int as stars_${stars}`).join(', ')}
     from product_reviews where product_id = $1 and not hidden`,
    [productId],
  );
  const row = result.rows[0];
  const starCounts = Object.fromEntries([5, 4, 3, 2, 1].map((stars) => [stars, row[`stars_${stars}`]]));
  return { average: row.average, ratingCount: row.rating_count, reviewCount: row.review_count, starCounts };
}

// Newest first; reviews with words before stars-only ones of the same day.
export async function findProductReviews(executor, reviewFilter, { limit, offset }) {
  const { whereClause, values } = reviewFilter;
  const result = await executor.query(
    `select review.id, review.rating, review.tags, review.body, review.pack_label, review.created_at, review.updated_at,
            customer.name as customer_name, zone.name as zone_name
     ${reviewsFrom} ${whereClause}
     order by review.created_at::date desc, (coalesce(review.body, '') <> '') desc, review.created_at desc
     limit $${values.length + 1} offset $${values.length + 2}`,
    [...values, limit, offset],
  );
  return result.rows.map(toReview);
}

// The pack this customer last received of this product, or null if they never received it.
export async function findDeliveredPurchase(executor, customerId, productId) {
  const result = await executor.query(
    `select item.pack_label, placed.delivery_date::text as delivery_date
     from order_items item
     join orders placed on placed.id = item.order_id
     join pack_sizes pack on pack.id = item.pack_size_id
     where placed.customer_id = $1 and pack.product_id = $2 and placed.status = 'delivered'
     order by placed.delivery_date desc, placed.id desc
     limit 1`,
    [customerId, productId],
  );
  const row = result.rows[0];
  return row ? { packLabel: row.pack_label, deliveryDate: row.delivery_date } : null;
}

export async function findCustomerReview(executor, customerId, productId) {
  const result = await executor.query(
    `select review.id, review.rating, review.tags, review.body, review.pack_label, review.created_at, review.updated_at,
            customer.name as customer_name, zone.name as zone_name
     ${reviewsFrom} where review.customer_id = $1 and review.product_id = $2`,
    [customerId, productId],
  );
  return result.rows[0] ? toReview(result.rows[0]) : null;
}

// One review per customer per product: saving again replaces it (a hidden one stays hidden).
export async function upsertReview(executor, { productId, customerId, rating, tags, body, packLabel }) {
  await executor.query(
    `insert into product_reviews (product_id, customer_id, rating, tags, body, pack_label)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (product_id, customer_id) do update set
       rating = excluded.rating, tags = excluded.tags, body = excluded.body,
       pack_label = excluded.pack_label, updated_at = now()`,
    [productId, customerId, rating, tags, body, packLabel],
  );
}

// { productId: rating } for the products of one order.
export async function findCustomerRatings(executor, customerId, productIds) {
  const result = await executor.query(
    'select product_id, rating from product_reviews where customer_id = $1 and product_id = any($2::bigint[])',
    [customerId, productIds],
  );
  return Object.fromEntries(result.rows.map((row) => [row.product_id, row.rating]));
}

const adminReviewsFrom = `${reviewsFrom} join products product on product.id = review.product_id`;

export async function findReviewsForAdmin(executor, reviewFilter, page) {
  const { whereClause, values } = reviewFilter;
  const result = await executor.query(
    `select review.id, review.rating, review.tags, review.body, review.pack_label, review.created_at, review.updated_at,
            review.hidden, customer.name as customer_name, zone.name as zone_name, product.id as product_id, product.name as product_name
     ${adminReviewsFrom} ${whereClause}
     order by review.created_at desc
     limit $${values.length + 1} offset $${values.length + 2}`,
    [...values, page.limit, page.offset],
  );
  return result.rows.map((row) => ({ ...toReview(row), hidden: row.hidden, productId: row.product_id, productName: row.product_name }));
}

export async function countReviewsForAdmin(executor, { whereClause, values }) {
  const result = await executor.query(`select count(*)::int as review_count ${adminReviewsFrom} ${whereClause}`, values);
  return result.rows[0].review_count;
}

// For the page heading: average and count of shown ratings, and how many are hidden.
export async function findReviewTotals(executor) {
  const result = await executor.query(
    `select round(avg(rating) filter (where not hidden), 1) as average,
            count(*) filter (where not hidden)::int as shown_count, count(*) filter (where hidden)::int as hidden_count
     from product_reviews`,
  );
  const row = result.rows[0];
  return { average: row.average, shownCount: row.shown_count, hiddenCount: row.hidden_count };
}

// Returns false when the review does not exist.
export async function setReviewHidden(executor, reviewId, hidden) {
  const result = await executor.query('update product_reviews set hidden = $2 where id = $1', [reviewId, hidden]);
  return result.rowCount > 0;
}
