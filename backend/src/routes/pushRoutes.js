import { Router } from 'express';

// Signed-in users turn order alerts on or off for this browser.
export function createPushRouter({ pushSubscriptionService }) {
  const router = Router();
  router.post('/subscriptions', async (request, response) => {
    response.status(201).json(await pushSubscriptionService.subscribe(request.user, request.body ?? {}));
  });
  router.delete('/subscriptions', async (request, response) => {
    response.json(await pushSubscriptionService.unsubscribe(request.user, request.body ?? {}));
  });
  return router;
}
