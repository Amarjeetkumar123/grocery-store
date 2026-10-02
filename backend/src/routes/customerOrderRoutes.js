import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

// Stops a stuck button or a script from placing many orders.
const limitOrderPlacing = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: (request) => request.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many orders in a short time. Please wait a few minutes.' },
});

// Signed-in customers: place, view and cancel their own orders.
export function createCustomerOrderRouter({ checkoutService, customerOrderService }) {
  const router = Router();
  router.post('/', limitOrderPlacing, async (request, response) => {
    response.status(201).json(await checkoutService.placeOrder(request.user, request.body ?? {}));
  });
  router.get('/', async (request, response) => {
    response.json(await customerOrderService.listMyOrders(request.user));
  });
  router.get('/:orderNumber', async (request, response) => {
    response.json(await customerOrderService.getMyOrder(request.user, request.params.orderNumber));
  });
  router.post('/:orderNumber/cancel', async (request, response) => {
    response.json(await customerOrderService.cancelMyOrder(request.user, request.params.orderNumber));
  });
  return router;
}
