import { createFilterBuilder } from './filterBuilder.js';

// Filters for product lists. includeHidden is for the admin panel: it also
// shows hidden products and pack sizes. Returns { whereClause, values, includeHidden }.
export function buildProductFilter({ categoryId, productId, searchText, includeHidden = false }) {
  const filter = createFilterBuilder();
  if (!includeHidden) filter.where('product.active');
  filter
    .whereEquals('product.category_id', categoryId)
    .whereEquals('product.id', productId)
    .whereAnyContains(['product.name', 'product.brand', 'category.name'], searchText);
  return { ...filter.build(), includeHidden };
}
