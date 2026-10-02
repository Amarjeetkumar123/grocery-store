// productFilter comes from filters/productFilters.js. The two fragments
// below are fixed text chosen by includeHidden, never user input.
function productsWithPackSizesQuery({ whereClause, includeHidden }) {
  const packSizeCondition = includeHidden ? '' : 'and pack.active';
  const onlyWithPackSizes = includeHidden ? '' : 'having count(pack.id) > 0';
  return `
    select product.id, product.category_id, category.name as category_name, product.name, product.brand,
           product.description, product.manufacturer, product.country_of_origin, product.image_path, product.active,
           coalesce(
             json_agg(json_build_object(
               'id', pack.id, 'label', pack.label, 'maximumRetailPrice', pack.maximum_retail_price,
               'price', pack.price, 'stock', pack.stock, 'lowStockLevel', pack.low_stock_level,
               'bestBefore', pack.best_before, 'active', pack.active
             ) order by pack.sort_order, pack.price) filter (where pack.id is not null),
             '[]'
           ) as pack_sizes
    from products product
    join categories category on category.id = product.category_id
    left join pack_sizes pack on pack.product_id = product.id ${packSizeCondition}
    ${whereClause}
    group by product.id, category.name
    ${onlyWithPackSizes}
    order by product.name
    limit 500`;
}

function toProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    brand: row.brand,
    description: row.description,
    manufacturer: row.manufacturer,
    countryOfOrigin: row.country_of_origin,
    imagePath: row.image_path,
    active: row.active,
    packSizes: row.pack_sizes,
  };
}

export async function findProducts(executor, productFilter) {
  const result = await executor.query(productsWithPackSizesQuery(productFilter), productFilter.values);
  return result.rows.map(toProduct);
}

export async function productExists(executor, productId) {
  const result = await executor.query('select 1 from products where id = $1', [productId]);
  return result.rowCount > 0;
}

function productValues(product) {
  return [product.categoryId, product.name, product.brand, product.description,
    product.manufacturer, product.countryOfOrigin, product.active];
}

export async function insertProduct(executor, product) {
  const result = await executor.query(
    `insert into products (category_id, name, brand, description, manufacturer, country_of_origin, active)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    productValues(product),
  );
  return result.rows[0].id;
}

// Returns false when the product does not exist.
export async function updateProduct(executor, productId, product) {
  const result = await executor.query(
    `update products
     set category_id = $2, name = $3, brand = $4, description = $5, manufacturer = $6,
         country_of_origin = $7, active = $8
     where id = $1`,
    [productId, ...productValues(product)],
  );
  return result.rowCount > 0;
}

export async function setProductImagePath(executor, productId, imagePath) {
  await executor.query('update products set image_path = $2 where id = $1', [productId, imagePath]);
}

// Same category, name and brand (ignoring capital letters) = same product.
export async function findProductIdByNameAndBrand(executor, categoryId, name, brand) {
  const result = await executor.query(
    `select id from products
     where category_id = $1 and lower(name) = lower($2) and lower(coalesce(brand, '')) = lower(coalesce($3, ''))
     limit 1`,
    [categoryId, name, brand],
  );
  return result.rows[0]?.id ?? null;
}

// Only fills in details that the spreadsheet provides.
export async function updateProductDetailsIfGiven(executor, productId, manufacturer, description) {
  await executor.query(
    `update products set manufacturer = coalesce($2, manufacturer), description = coalesce($3, description)
     where id = $1`,
    [productId, manufacturer, description],
  );
}
