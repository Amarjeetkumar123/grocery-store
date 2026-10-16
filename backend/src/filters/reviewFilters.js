import { createFilterBuilder } from './filterBuilder.js';

const showConditions = {
  low: 'review.rating <= 2',
  text: "coalesce(review.body, '') <> ''",
  hidden: 'review.hidden',
};

// Product page: shown reviews of one product, optionally one star group.
export function buildProductReviewFilter({ productId, stars }) {
  const builder = createFilterBuilder()
    .whereEquals('review.product_id', productId)
    .where('not review.hidden');
  if (stars === 'low') builder.where('review.rating <= 3');
  else if (stars) builder.whereEquals('review.rating', Number(stars));
  return builder.build();
}

// Admin Reviews page: search product or customer, and show all, low (1-2 stars), with text or hidden.
export function buildAdminReviewFilter({ searchText, show }) {
  const builder = createFilterBuilder().whereAnyContains(['product.name', 'customer.name'], searchText);
  if (showConditions[show]) builder.where(showConditions[show]);
  return builder.build();
}
