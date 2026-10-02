import { createFilterBuilder } from './filterBuilder.js';

// Expiring soon = best before within the next 30 days (Indian date).
const conditionsByStockStatus = {
  out: 'pack.stock = 0',
  low: 'pack.stock > 0 and pack.stock <= pack.low_stock_level',
  expiring: `pack.best_before is not null
             and pack.best_before <= (now() at time zone 'Asia/Kolkata')::date + 30`,
};

export const stockStatuses = ['all', ...Object.keys(conditionsByStockStatus)];

// Filters for the stock screen: status (all / out / low / expiring),
// category and search text. Returns { whereClause, values }.
export function buildStockFilter({ status = 'all', categoryId, searchText }) {
  const filter = createFilterBuilder()
    .where('pack.active')
    .where('product.active')
    .whereEquals('product.category_id', categoryId)
    .whereAnyContains(['product.name', 'product.brand'], searchText);
  if (conditionsByStockStatus[status]) filter.where(`(${conditionsByStockStatus[status]})`);
  return filter.build();
}
