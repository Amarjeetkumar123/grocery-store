import { Router } from 'express';

// Signed-in customers: cart totals and open delivery slots (see application.js).
export function createCheckoutRouter({ checkoutService }) {
  const router = Router();
  router.post('/quote', async (request, response) => {
    response.json(await checkoutService.quoteCart(request.user, request.body ?? {}));
  });
  router.get('/slots', async (request, response) => {
    response.json(await checkoutService.listDeliverySlots(request.user));
  });
  return router;
}
