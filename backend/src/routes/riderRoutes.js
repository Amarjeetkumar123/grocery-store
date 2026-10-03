import { Router } from 'express';

// Riders: their own deliveries only (the service checks each order).
export function createRiderRouter({ deliveryService }) {
  const router = Router();
  // ?date=2026-10-04 (default today)
  router.get('/deliveries', async (request, response) => {
    response.json(await deliveryService.listMyDeliveries(request.staffMember, request.query));
  });
  router.post('/orders/:orderNumber/start', async (request, response) => {
    response.json(await deliveryService.startDelivery(request.staffMember, request.params.orderNumber));
  });
  router.post('/orders/:orderNumber/payment', async (request, response) => {
    response.json(await deliveryService.recordPayment(request.staffMember, request.params.orderNumber, request.body ?? {}));
  });
  router.post('/orders/:orderNumber/delivered', async (request, response) => {
    response.json(await deliveryService.markDelivered(request.staffMember, request.params.orderNumber));
  });
  return router;
}
