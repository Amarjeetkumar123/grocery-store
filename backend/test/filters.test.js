import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFilterBuilder } from '../src/filters/filterBuilder.js';
import { buildProductFilter } from '../src/filters/productFilters.js';
import { buildStockFilter } from '../src/filters/stockFilters.js';

test('filter builder numbers placeholders and skips empty values', () => {
  const { whereClause, values } = createFilterBuilder()
    .where('product.active')
    .whereEquals('product.category_id', 4)
    .whereEquals('product.id', null)
    .whereAnyContains(['product.name', 'product.brand'], ' atta ')
    .build();
  assert.equal(whereClause, 'where product.active and product.category_id = $1 and (product.name ilike $2 or product.brand ilike $2)');
  assert.deepEqual(values, [4, '%atta%']);
});

test('no conditions gives an empty where clause', () => {
  assert.deepEqual(createFilterBuilder().build(), { whereClause: '', values: [] });
});

test('search text with % and _ is matched literally, never as a wildcard', () => {
  const { values } = createFilterBuilder().whereAnyContains(['product.name'], '50%_off').build();
  assert.deepEqual(values, ['%50\\%\\_off%']);
});

test('product filter hides inactive products unless includeHidden', () => {
  assert.match(buildProductFilter({}).whereClause, /product\.active/);
  assert.equal(buildProductFilter({ includeHidden: true }).whereClause, '');
});

test('stock filter adds the chosen status and ignores unknown ones', () => {
  assert.match(buildStockFilter({ status: 'low' }).whereClause, /pack\.stock <= pack\.low_stock_level/);
  assert.doesNotMatch(buildStockFilter({ status: 'everything' }).whereClause, /low_stock_level/);
});
