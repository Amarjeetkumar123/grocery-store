import { Router } from 'express';
import { requireRole } from '../authentication.js';

// Owner only: read every rating and hide one from the shop.
export function createAdminReviewRouter({ reviewService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');
  // ?search=&show=all|low|text|hidden&page=&pageSize=
  router.get('/reviews', ownerOnly, async (request, response) => response.json(await reviewService.listReviewsForAdmin(request.query)));
  router.put('/reviews/:reviewId', ownerOnly, async (request, response) => {
    response.json(await reviewService.saveReviewVisibility(request.params.reviewId, request.body ?? {}));
  });
  return router;
}
