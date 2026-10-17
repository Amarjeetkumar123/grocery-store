import { foreignKeyViolationErrorCode, uniqueViolationErrorCode, withTransaction } from '../dbHelper/databaseConnection.js';
import { categoryExists } from '../dbHelper/categoryDbHelper.js';
import {
  countProducts, deleteProduct as deleteProductRow, findProducts, insertProduct, updateProduct as updateProductRow,
} from '../dbHelper/productDbHelper.js';
import { hidePackSizesExcept, insertPackSize, updatePackSize } from '../dbHelper/packSizeDbHelper.js';
import { buildProductFilter } from '../filters/productFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { validateProductInput } from '../validators/productValidation.js';
import { readPage } from '../validators/pagingValidation.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

class PackSizeNotInProductError extends Error {}

// photos: [{ id, url }] in order; imageUrl is the cover (the first photo).
export function photosWithUrls(photos, productImageStorage) {
  return photos.map((photo) => ({ id: photo.id, url: productImageStorage.publicUrlFor(photo.path) }));
}

function toAdminProduct(product, productImageStorage) {
  const { imagePath, photos, ...visibleProduct } = product;
  return { ...visibleProduct, imageUrl: productImageStorage.publicUrlFor(imagePath), photos: photosWithUrls(photos, productImageStorage) };
}

export async function findAdminProduct({ database, productImageStorage }, productId) {
  const [product] = productId
    ? await findProducts(database, buildProductFilter({ productId, includeHidden: true }))
    : [];
  if (!product) throw ServiceError.notFound('Product not found.');
  return { product: toAdminProduct(product, productImageStorage) };
}

// One page of products. query: { categoryId, search, page, pageSize }.
async function listProducts({ database, productImageStorage }, query) {
  const productFilter = buildProductFilter({
    includeHidden: true,
    categoryId: readPositiveInteger(query.categoryId),
    searchText: query.search,
  });
  const total = await countProducts(database, productFilter);
  const { page, pageSize, pageCount, limit, offset } = readPage(query, total);
  const products = await findProducts(database, productFilter, { limit, offset });
  return { products: products.map((product) => toAdminProduct(product, productImageStorage)), total, page, pageSize, pageCount };
}

async function validateProductForm(database, body) {
  const { product, packSizes, fieldErrors } = validateProductInput(body);
  if (product.categoryId && !(await categoryExists(database, product.categoryId))) {
    fieldErrors.categoryId = 'Please choose a category.';
  }
  throwIfFieldErrors(fieldErrors);
  return { product, packSizes };
}

// Turns database rule violations into messages the owner can act on.
async function saveWithFriendlyErrors(save) {
  try {
    return await save();
  } catch (error) {
    if (error.code === uniqueViolationErrorCode) {
      throw ServiceError.invalidFields({ packSizes: 'Each pack size label must be different.' });
    }
    if (error instanceof PackSizeNotInProductError) {
      throw ServiceError.badRequest('A pack size does not belong to this product. Reload and try again.');
    }
    throw error;
  }
}

async function createProduct(dependencies, body) {
  const { database } = dependencies;
  const { product, packSizes } = await validateProductForm(database, body);
  const productId = await saveWithFriendlyErrors(() => withTransaction(database, async (client) => {
    const newProductId = await insertProduct(client, product);
    for (const [sortOrder, packSize] of packSizes.entries()) {
      await insertPackSize(client, newProductId, packSize, sortOrder);
    }
    return newProductId;
  }));
  return findAdminProduct(dependencies, productId);
}

// Sends every pack size; ones left out are hidden (they may be in old orders).
async function savePackSizesForProduct(client, productId, packSizes) {
  const keptPackSizeIds = [];
  for (const [sortOrder, packSize] of packSizes.entries()) {
    if (!packSize.id) {
      keptPackSizeIds.push(await insertPackSize(client, productId, packSize, sortOrder));
      continue;
    }
    if (!(await updatePackSize(client, productId, packSize, sortOrder))) throw new PackSizeNotInProductError();
    keptPackSizeIds.push(packSize.id);
  }
  await hidePackSizesExcept(client, productId, keptPackSizeIds);
}

async function updateProduct(dependencies, productIdInput, body) {
  const { database } = dependencies;
  const productId = readPositiveInteger(productIdInput);
  if (!productId) throw ServiceError.notFound('Product not found.');
  const { product, packSizes } = await validateProductForm(database, body);
  const updated = await saveWithFriendlyErrors(() => withTransaction(database, async (client) => {
    if (!(await updateProductRow(client, productId, product))) return false;
    await savePackSizesForProduct(client, productId, packSizes);
    return true;
  }));
  if (!updated) throw ServiceError.notFound('Product not found.');
  return findAdminProduct(dependencies, productId);
}

// A product never ordered is removed with its pack sizes. One in past orders
// stays, so those orders keep their items; the owner hides it instead.
// ponytail: its photo stays in storage; remove it too if storage space matters.
async function deleteProduct({ database }, productIdInput) {
  const productId = readPositiveInteger(productIdInput);
  try {
    if (productId && await deleteProductRow(database, productId)) return { deleted: true };
  } catch (error) {
    if (error.code !== foreignKeyViolationErrorCode) throw error;
    throw ServiceError.conflict('This product is in past orders, so it cannot be deleted. Edit it and turn off "Show in the shop" to hide it.');
  }
  throw ServiceError.notFound('Product not found.');
}

export function createProductService(dependencies) {
  return {
    listProducts: (query) => listProducts(dependencies, query),
    getProduct: (productIdInput) => findAdminProduct(dependencies, readPositiveInteger(productIdInput)),
    createProduct: (body) => createProduct(dependencies, body),
    updateProduct: (productIdInput, body) => updateProduct(dependencies, productIdInput, body),
    deleteProduct: (productIdInput) => deleteProduct(dependencies, productIdInput),
  };
}
