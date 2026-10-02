import { uniqueViolationErrorCode, withTransaction } from '../dbHelper/databaseConnection.js';
import { categoryExists } from '../dbHelper/categoryDbHelper.js';
import {
  findProducts, insertProduct, productExists, setProductImagePath, updateProduct as updateProductRow,
} from '../dbHelper/productDbHelper.js';
import { hidePackSizesExcept, insertPackSize, updatePackSize } from '../dbHelper/packSizeDbHelper.js';
import { buildProductFilter } from '../filters/productFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { validateProductInput } from '../validators/productValidation.js';
import { isRealImage } from '../storage/productImageStorage.js';
import { ServiceError, throwIfFieldErrors } from './serviceError.js';

class PackSizeNotInProductError extends Error {}

function toAdminProduct(product, productImageStorage) {
  const { imagePath, ...visibleProduct } = product;
  return { ...visibleProduct, imageUrl: productImageStorage.publicUrlFor(imagePath) };
}

async function findAdminProduct({ database, productImageStorage }, productId) {
  const [product] = productId
    ? await findProducts(database, buildProductFilter({ productId, includeHidden: true }))
    : [];
  if (!product) throw ServiceError.notFound('Product not found.');
  return { product: toAdminProduct(product, productImageStorage) };
}

async function listProducts({ database, productImageStorage }, query) {
  const products = await findProducts(database, buildProductFilter({
    includeHidden: true,
    categoryId: readPositiveInteger(query.categoryId),
    searchText: query.search,
  }));
  return { products: products.map((product) => toAdminProduct(product, productImageStorage)) };
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

async function uploadProductImage(dependencies, productIdInput, imageBytes, contentType) {
  const { database, productImageStorage } = dependencies;
  if (!productImageStorage.isConfigured) {
    throw ServiceError.unavailable('Photo upload is not set up yet (SUPABASE_SECRET_KEY is missing).');
  }
  if (!Buffer.isBuffer(imageBytes) || !isRealImage(imageBytes, contentType)) {
    throw ServiceError.badRequest('Please choose a JPG, PNG or WebP photo (up to 3 MB).');
  }
  const productId = readPositiveInteger(productIdInput);
  if (!productId || !(await productExists(database, productId))) throw ServiceError.notFound('Product not found.');

  const imagePath = await productImageStorage.uploadProductImage(productId, imageBytes, contentType);
  await setProductImagePath(database, productId, imagePath);
  return findAdminProduct(dependencies, productId);
}

export function createProductService(dependencies) {
  return {
    listProducts: (query) => listProducts(dependencies, query),
    getProduct: (productIdInput) => findAdminProduct(dependencies, readPositiveInteger(productIdInput)),
    createProduct: (body) => createProduct(dependencies, body),
    updateProduct: (productIdInput, body) => updateProduct(dependencies, productIdInput, body),
    uploadProductImage: (productIdInput, imageBytes, contentType) =>
      uploadProductImage(dependencies, productIdInput, imageBytes, contentType),
  };
}
