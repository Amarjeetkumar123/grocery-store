import express, { Router } from 'express';
import { requireRole } from '../authentication.js';
import { allowedImageTypes } from '../storage/productImageStorage.js';

const readImageBody = express.raw({ type: allowedImageTypes, limit: '3mb' });
const readCsvBody = express.text({ type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], limit: '1mb' });

// Viewing products: owner and packer. Changing them: owner only.
export function createAdminProductRouter({ productService, productImportService }) {
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
  router.post('/products/:productId/image', ownerOnly, readImageBody, async (request, response) => {
    response.json(await productService.uploadProductImage(
      request.params.productId, request.body, request.get('content-type'),
    ));
  });
  router.post('/products/bulk-import', ownerOnly, readCsvBody, async (request, response) => {
    response.json(await productImportService.importProductsFromCsv(request.body));
  });
  return router;
}
