import { Router } from 'express';

// Owner and packer: see stock, add new stock, correct counts.
export function createAdminStockRouter({ stockService }) {
  const router = Router();
  // ?status=all|out|low|expiring&categoryId=1&search=atta
  router.get('/stock', async (request, response) => {
    response.json(await stockService.listStock(request.query));
  });
  router.post('/pack-sizes/:packSizeId/stock-adjustments', async (request, response) => {
    response.json(await stockService.adjustStock(request.params.packSizeId, request.body ?? {}));
  });
  return router;
}
