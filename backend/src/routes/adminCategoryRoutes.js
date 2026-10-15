import express, { Router } from 'express';
import { requireRole } from '../authentication.js';
import { allowedImageTypes } from '../storage/productImageStorage.js';

const readImageBody = express.raw({ type: allowedImageTypes, limit: '3mb' });

// Categories: owner only. Each change answers with the full, fresh list.
export function createAdminCategoryRouter({ categoryService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');

  router.get('/categories', ownerOnly, async (request, response) => {
    response.json(await categoryService.listCategories());
  });
  router.post('/categories', ownerOnly, async (request, response) => {
    response.status(201).json(await categoryService.createCategory(request.body ?? {}));
  });
  router.put('/categories/:categoryId', ownerOnly, async (request, response) => {
    response.json(await categoryService.updateCategory(request.params.categoryId, request.body ?? {}));
  });
  router.delete('/categories/:categoryId', ownerOnly, async (request, response) => {
    response.json(await categoryService.deleteCategory(request.params.categoryId));
  });
  router.post('/categories/:categoryId/image', ownerOnly, readImageBody, async (request, response) => {
    response.json(await categoryService.uploadCategoryImage(
      request.params.categoryId, request.body, request.get('content-type'),
    ));
  });
  return router;
}
