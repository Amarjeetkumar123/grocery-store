// A product's photos in order; the first one is the cover, also kept in
// products.image_path so cards, the cart and search need no extra join.

// Locks the product while its photos change, so two uploads cannot both pass the limit.
export async function lockProductPhotos(executor, productId) {
  const result = await executor.query(
    `select (select count(*)::int from product_photos where product_id = $1) as photo_count
     from products where id = $1 for update`,
    [productId],
  );
  return result.rows[0] ? { photoCount: result.rows[0].photo_count } : null;
}

export async function insertProductPhoto(executor, productId, imagePath) {
  await executor.query(
    `insert into product_photos (product_id, image_path, sort_order)
     values ($1, $2, (select coalesce(max(sort_order) + 1, 0) from product_photos where product_id = $1))`,
    [productId, imagePath],
  );
}

// Returns false when the photo is not one of this product's.
export async function replaceProductPhoto(executor, productId, photoId, imagePath) {
  const result = await executor.query(
    'update product_photos set image_path = $3 where id = $2 and product_id = $1',
    [productId, photoId, imagePath],
  );
  return result.rowCount > 0;
}

export async function deleteProductPhoto(executor, productId, photoId) {
  const result = await executor.query('delete from product_photos where id = $2 and product_id = $1', [productId, photoId]);
  return result.rowCount > 0;
}

// photoIds: every photo of the product, in the new order. Returns false when the list
// is not exactly this product's photos (a photo added or removed in another tab).
export async function reorderProductPhotos(executor, productId, photoIds) {
  const result = await executor.query(
    `update product_photos photo set sort_order = ordered.position
     from unnest($2::bigint[]) with ordinality as ordered(id, position)
     where photo.id = ordered.id and photo.product_id = $1`,
    [productId, photoIds],
  );
  const total = await executor.query('select count(*)::int as photo_count from product_photos where product_id = $1', [productId]);
  return result.rowCount === photoIds.length && total.rows[0].photo_count === photoIds.length;
}

// Copies the first photo (or none) to products.image_path after any change.
export async function refreshProductCover(executor, productId) {
  await executor.query(
    `update products set image_path = (
       select image_path from product_photos where product_id = $1 order by sort_order, id limit 1)
     where id = $1`,
    [productId],
  );
}
