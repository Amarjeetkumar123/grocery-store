export async function insertPackSize(executor, productId, packSize, sortOrder) {
  const result = await executor.query(
    `insert into pack_sizes (product_id, label, maximum_retail_price, price, stock, low_stock_level,
                             best_before, active, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [productId, packSize.label, packSize.maximumRetailPrice, packSize.price, packSize.stock,
      packSize.lowStockLevel, packSize.bestBefore, packSize.active, sortOrder],
  );
  return result.rows[0].id;
}

// Stock is not changed here: it moves only through stock adjustments and
// orders, so an edit can never overwrite a sale made a moment earlier.
// Returns false when the pack size is not part of this product.
export async function updatePackSize(executor, productId, packSize, sortOrder) {
  const result = await executor.query(
    `update pack_sizes
     set label = $3, maximum_retail_price = $4, price = $5, low_stock_level = $6, best_before = $7,
         active = $8, sort_order = $9
     where id = $1 and product_id = $2`,
    [packSize.id, productId, packSize.label, packSize.maximumRetailPrice, packSize.price,
      packSize.lowStockLevel, packSize.bestBefore, packSize.active, sortOrder],
  );
  return result.rowCount > 0;
}

// Pack sizes cannot be deleted once ordered, so removed ones are hidden.
export async function hidePackSizesExcept(executor, productId, keptPackSizeIds) {
  await executor.query(
    'update pack_sizes set active = false where product_id = $1 and not (id = any($2::bigint[]))',
    [productId, keptPackSizeIds],
  );
}

// The spreadsheet's stock column is a stock count: it replaces the number.
// Returns true when a new pack size was created, false when one was updated.
export async function upsertImportedPackSize(executor, productId, packSize) {
  const result = await executor.query(
    `insert into pack_sizes (product_id, label, maximum_retail_price, price, stock, low_stock_level, best_before)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (product_id, label) do update set
       maximum_retail_price = excluded.maximum_retail_price, price = excluded.price, stock = excluded.stock,
       low_stock_level = excluded.low_stock_level, best_before = excluded.best_before, active = true
     returning (xmax = 0) as inserted`,
    [productId, packSize.label, packSize.maximumRetailPrice, packSize.price, packSize.stock,
      packSize.lowStockLevel, packSize.bestBefore],
  );
  return result.rows[0].inserted;
}

export async function packSizeExists(executor, packSizeId) {
  const result = await executor.query('select 1 from pack_sizes where id = $1', [packSizeId]);
  return result.rowCount > 0;
}

// "stock + change >= 0" stops stock going below zero, even when two
// people adjust the same item at the same moment. Returns the new stock,
// or null when it would go below zero (or the pack size does not exist).
export async function adjustPackSizeStock(executor, packSizeId, quantityChange) {
  const result = await executor.query(
    'update pack_sizes set stock = stock + $2 where id = $1 and stock + $2 >= 0 returning stock',
    [packSizeId, quantityChange],
  );
  return result.rows[0]?.stock ?? null;
}

// stockFilter comes from filters/stockFilters.js.
export async function findStockItems(executor, stockFilter) {
  const result = await executor.query(
    `select pack.id as pack_size_id, product.id as product_id, product.name as product_name, product.brand,
            category.name as category_name, pack.label, pack.stock, pack.low_stock_level, pack.best_before,
            pack.stock = 0 as out_of_stock,
            pack.stock > 0 and pack.stock <= pack.low_stock_level as low_stock,
            pack.best_before is not null
              and pack.best_before <= (now() at time zone 'Asia/Kolkata')::date + 30 as expiring_soon
     from pack_sizes pack
     join products product on product.id = pack.product_id
     join categories category on category.id = product.category_id
     ${stockFilter.whereClause}
     order by pack.stock = 0 desc, pack.stock <= pack.low_stock_level desc, product.name, pack.sort_order`,
    stockFilter.values,
  );
  return result.rows.map(toStockItem);
}

function toStockItem(row) {
  return {
    packSizeId: row.pack_size_id,
    productId: row.product_id,
    productName: row.product_name,
    brand: row.brand,
    categoryName: row.category_name,
    label: row.label,
    stock: row.stock,
    lowStockLevel: row.low_stock_level,
    bestBefore: row.best_before,
    outOfStock: row.out_of_stock,
    lowStock: row.low_stock,
    expiringSoon: row.expiring_soon,
  };
}

// Pack sizes in a cart, with current prices and stock. "available" is
// false for hidden products or packs and coming-soon categories.
// lockRows (inside a transaction) holds the rows until the order is saved;
// rows are locked in id order so two orders never wait on each other.
export async function findPackSizesForCart(executor, packSizeIds, { lockRows = false } = {}) {
  const result = await executor.query(
    `select pack.id, pack.label, pack.price, pack.maximum_retail_price, pack.stock, pack.low_stock_level,
            product.id as product_id, product.name as product_name, product.brand, product.image_path,
            category.name as category_name,
            (pack.active and product.active and not category.coming_soon) as available
     from pack_sizes pack
     join products product on product.id = pack.product_id
     join categories category on category.id = product.category_id
     where pack.id = any($1::bigint[])
     order by pack.id
     ${lockRows ? 'for update of pack' : ''}`,
    [packSizeIds],
  );
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    price: row.price,
    maximumRetailPrice: row.maximum_retail_price,
    stock: row.stock,
    lowStockLevel: row.low_stock_level,
    productId: row.product_id,
    productName: row.product_name,
    brand: row.brand,
    imagePath: row.image_path,
    categoryName: row.category_name,
    available: row.available,
  }));
}
