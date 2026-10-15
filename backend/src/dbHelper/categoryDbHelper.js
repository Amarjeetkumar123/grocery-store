const toCategory = (row) => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
  comingSoon: row.coming_soon,
  imagePath: row.image_path,
});

export async function findAllCategories(executor) {
  const result = await executor.query('select id, name, sort_order, coming_soon, image_path from categories order by sort_order, name');
  return result.rows.map(toCategory);
}

const categoriesWithProductCountQuery = `
  select category.id, category.name, category.sort_order, category.coming_soon, category.image_path,
         count(product.id)::int as product_count
  from categories category
  left join products product on product.category_id = category.id
  group by category.id
  order by category.sort_order, category.name`;

export async function findCategoriesWithProductCount(executor) {
  const result = await executor.query(categoriesWithProductCountQuery);
  return result.rows.map((row) => ({ ...toCategory(row), productCount: row.product_count }));
}

export async function categoryExists(executor, categoryId) {
  const result = await executor.query('select 1 from categories where id = $1', [categoryId]);
  return result.rowCount > 0;
}

export async function insertCategory(executor, category) {
  const result = await executor.query(
    'insert into categories (name, sort_order, coming_soon) values ($1, $2, $3) returning id',
    [category.name, category.sortOrder, category.comingSoon],
  );
  return result.rows[0].id;
}

// "previous" is the row as it was, so the caller can see what changed.
const updateCategoryQuery = `
  update categories category set name = $2, sort_order = $3, coming_soon = $4
  from (select id, coming_soon from categories where id = $1) previous
  where category.id = previous.id
  returning previous.coming_soon as was_coming_soon`;

// Returns { wasComingSoon }, or null when no category has this id.
export async function updateCategory(executor, categoryId, category) {
  const result = await executor.query(updateCategoryQuery, [categoryId, category.name, category.sortOrder, category.comingSoon]);
  return result.rows[0] ? { wasComingSoon: result.rows[0].was_coming_soon } : null;
}

export async function deleteCategory(executor, categoryId) {
  const result = await executor.query('delete from categories where id = $1', [categoryId]);
  return result.rowCount > 0;
}

export async function setCategoryImagePath(executor, categoryId, imagePath) {
  await executor.query('update categories set image_path = $2 where id = $1', [categoryId, imagePath]);
}

// Map of lower-case category name -> id, for matching spreadsheet rows.
export async function findCategoryIdsByLowerCaseName(executor) {
  const result = await executor.query('select id, name from categories');
  return new Map(result.rows.map((row) => [row.name.toLowerCase(), row.id]));
}
