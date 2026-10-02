export async function findAllCategories(executor) {
  const result = await executor.query('select id, name, coming_soon from categories order by sort_order, name');
  return result.rows.map((row) => ({ id: row.id, name: row.name, comingSoon: row.coming_soon }));
}

export async function categoryExists(executor, categoryId) {
  const result = await executor.query('select 1 from categories where id = $1', [categoryId]);
  return result.rowCount > 0;
}

// Map of lower-case category name -> id, for matching spreadsheet rows.
export async function findCategoryIdsByLowerCaseName(executor) {
  const result = await executor.query('select id, name from categories');
  return new Map(result.rows.map((row) => [row.name.toLowerCase(), row.id]));
}
