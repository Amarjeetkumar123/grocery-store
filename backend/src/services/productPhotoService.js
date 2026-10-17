import { withTransaction } from '../dbHelper/databaseConnection.js';
import {
  deleteProductPhoto, insertProductPhoto, lockProductPhotos, refreshProductCover, reorderProductPhotos, replaceProductPhoto,
} from '../dbHelper/productPhotoDbHelper.js';
import { isRealImage } from '../storage/productImageStorage.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { findAdminProduct } from './productService.js';
import { ServiceError } from './serviceError.js';

export const maximumPhotosPerProduct = 6;

function checkImage({ productImageStorage }, imageBytes, contentType) {
  if (!productImageStorage.isConfigured) {
    throw ServiceError.unavailable('Photo upload is not set up yet (SUPABASE_SECRET_KEY is missing).');
  }
  if (!Buffer.isBuffer(imageBytes) || !isRealImage(imageBytes, contentType)) {
    throw ServiceError.badRequest('Please choose a JPG, PNG or WebP photo (up to 3 MB).');
  }
}

// Runs change(client) with the product locked, then copies the first photo to the cover.
async function changePhotos(database, productId, change) {
  await withTransaction(database, async (client) => {
    const photos = await lockProductPhotos(client, productId);
    if (!photos) throw ServiceError.notFound('Product not found.');
    await change(client, photos);
    await refreshProductCover(client, productId);
  });
}

// photoIdInput is left out for changes to the whole product (add, reorder).
function readIds(productIdInput, photoIdInput) {
  const productId = readPositiveInteger(productIdInput);
  if (!productId) throw ServiceError.notFound('Product not found.');
  if (photoIdInput === undefined) return { productId, photoId: null };
  const photoId = readPositiveInteger(photoIdInput);
  if (!photoId) throw ServiceError.notFound('Photo not found.');
  return { productId, photoId };
}

// Adds a photo at the end. The first photo of a product becomes its cover.
async function addPhoto(dependencies, productIdInput, imageBytes, contentType) {
  checkImage(dependencies, imageBytes, contentType);
  const { productId } = readIds(productIdInput);
  const imagePath = await dependencies.productImageStorage.uploadProductImage(productId, imageBytes, contentType);
  await changePhotos(dependencies.database, productId, async (client, { photoCount }) => {
    if (photoCount >= maximumPhotosPerProduct) throw ServiceError.badRequest(`A product can have up to ${maximumPhotosPerProduct} photos.`);
    await insertProductPhoto(client, productId, imagePath);
  });
  return findAdminProduct(dependencies, productId);
}

// A photo cropped again keeps its place in the order.
async function replacePhoto(dependencies, productIdInput, photoIdInput, imageBytes, contentType) {
  checkImage(dependencies, imageBytes, contentType);
  const { productId, photoId } = readIds(productIdInput, photoIdInput);
  const imagePath = await dependencies.productImageStorage.uploadProductImage(productId, imageBytes, contentType);
  await changePhotos(dependencies.database, productId, async (client) => {
    if (!(await replaceProductPhoto(client, productId, photoId, imagePath))) throw ServiceError.notFound('Photo not found.');
  });
  return findAdminProduct(dependencies, productId);
}

// ponytail: the file stays in the bucket (like replaced photos); clean up if storage nears the free limit.
async function deletePhoto(dependencies, productIdInput, photoIdInput) {
  const { productId, photoId } = readIds(productIdInput, photoIdInput);
  await changePhotos(dependencies.database, productId, async (client) => {
    if (!(await deleteProductPhoto(client, productId, photoId))) throw ServiceError.notFound('Photo not found.');
  });
  return findAdminProduct(dependencies, productId);
}

// body: { photoIds: [3, 1, 2] }, every photo of the product; the first becomes the cover.
async function reorderPhotos(dependencies, productIdInput, body) {
  const { productId } = readIds(productIdInput);
  const photoIds = Array.isArray(body.photoIds) ? body.photoIds.map(readPositiveInteger) : [];
  if (photoIds.length === 0 || photoIds.includes(null) || new Set(photoIds).size !== photoIds.length) {
    throw ServiceError.badRequest('Send the photos in their new order.');
  }
  await changePhotos(dependencies.database, productId, async (client) => {
    if (!(await reorderProductPhotos(client, productId, photoIds))) {
      throw ServiceError.conflict('The photos changed in the meantime. Reload and try again.');
    }
  });
  return findAdminProduct(dependencies, productId);
}

export function createProductPhotoService(dependencies) {
  return {
    addPhoto: (productIdInput, imageBytes, contentType) => addPhoto(dependencies, productIdInput, imageBytes, contentType),
    replacePhoto: (productIdInput, photoIdInput, imageBytes, contentType) =>
      replacePhoto(dependencies, productIdInput, photoIdInput, imageBytes, contentType),
    deletePhoto: (productIdInput, photoIdInput) => deletePhoto(dependencies, productIdInput, photoIdInput),
    reorderPhotos: (productIdInput, body) => reorderPhotos(dependencies, productIdInput, body),
  };
}
