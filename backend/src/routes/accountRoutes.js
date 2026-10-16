import { Router } from 'express';

// Everything here needs a signed-in user (see application.js).
export function createAccountRouter({ accountService, reviewService }) {
  const router = Router();
  router.get('/', async (request, response) => {
    response.json(await accountService.getAccount(request.user, request.staffMember));
  });
  router.put('/profile', async (request, response) => {
    response.json(await accountService.saveProfile(request.user, request.body ?? {}));
  });
  router.post('/notify-me', async (request, response) => {
    response.json(await accountService.requestNotifyMe(request.user, request.body ?? {}));
  });
  // My rating of one product: can I rate it, and what did I say.
  router.get('/reviews/:productId', async (request, response) => {
    response.json(await reviewService.getMyReview(request.user, request.params.productId));
  });
  router.put('/reviews/:productId', async (request, response) => {
    response.json(await reviewService.saveMyReview(request.user, request.params.productId, request.body ?? {}));
  });
  return router;
}
