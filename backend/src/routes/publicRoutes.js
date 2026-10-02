import { Router } from 'express';

// Information anyone may see without signing in.
export function createPublicRouter({ storeService, catalogueService }) {
  const router = Router();
  router.get('/store', async (request, response) => response.json(await storeService.getStoreDetails()));
  router.get('/zones', async (request, response) => response.json(await storeService.listActiveZones()));
  router.get('/categories', async (request, response) => response.json(await catalogueService.listCategories()));
  // ?categoryId=1 for one category, or ?search=atta to search everything.
  router.get('/products', async (request, response) => {
    response.json(await catalogueService.listProducts(request.query));
  });
  router.get('/products/:productId', async (request, response) => {
    response.json(await catalogueService.getProduct(request.params.productId));
  });
  return router;
}
