import express, { Router } from 'express';
import { requireRole } from '../authentication.js';
import { allowedImageTypes } from '../storage/productImageStorage.js';

const readImageBody = express.raw({ type: allowedImageTypes, limit: '3mb' });
const readCsvBody = express.text({ type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], limit: '1mb' });

// Viewing products: owner and packer. Changing them: owner only.
export function createAdminProductRouter({ productService, productPhotoService, productImportService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');

  router.get('/products', async (request, response) => {
    response.json(await productService.listProducts(request.query));
  });
  router.get('/products/:productId', async (request, response) => {
    response.json(await productService.getProduct(request.params.productId));
  });
  router.post('/products', ownerOnly, async (request, response) => {
    response.status(201).json(await productService.createProduct(request.body ?? {}));
  });
  router.put('/products/:productId', ownerOnly, async (request, response) => {
    response.json(await productService.updateProduct(request.params.productId, request.body ?? {}));
  });
  router.delete('/products/:productId', ownerOnly, async (request, response) => {
    response.json(await productService.deleteProduct(request.params.productId));
  });
  // Photos: up to 6, the first is the cover. Each answer is the whole product again.
  router.post('/products/:productId/photos', ownerOnly, readImageBody, async (request, response) => {
    response.status(201).json(await productPhotoService.addPhoto(request.params.productId, request.body, request.get('content-type')));
  });
  router.put('/products/:productId/photos/order', ownerOnly, async (request, response) => {
    response.json(await productPhotoService.reorderPhotos(request.params.productId, request.body ?? {}));
  });
  router.put('/products/:productId/photos/:photoId', ownerOnly, readImageBody, async (request, response) => {
    response.json(await productPhotoService.replacePhoto(
      request.params.productId, request.params.photoId, request.body, request.get('content-type'),
    ));
  });
  router.delete('/products/:productId/photos/:photoId', ownerOnly, async (request, response) => {
    response.json(await productPhotoService.deletePhoto(request.params.productId, request.params.photoId));
  });
  router.post('/products/bulk-import', ownerOnly, readCsvBody, async (request, response) => {
    response.json(await productImportService.importProductsFromCsv(request.body));
  });
  return router;
}
