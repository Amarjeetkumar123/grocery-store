import { Router } from 'express';
import { requireRole } from '../authentication.js';

// Order board for owner and packer. Cancelling and choosing riders: owner only.
export function createAdminOrderRouter({ adminOrderService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');

  // ?date=2026-10-04, or ?customerId=12 for one customer's orders
  router.get('/orders', async (request, response) => response.json(await adminOrderService.listOrders(request.query)));
  router.post('/orders/assign-rider', ownerOnly, async (request, response) => {
    response.json(await adminOrderService.assignRider(request.body ?? {}));
  });
  router.post('/orders/:orderNumber/status', async (request, response) => {
    response.json(await adminOrderService.moveOrderForward(request.staffMember, request.params.orderNumber, request.body ?? {}));
  });
  router.post('/orders/:orderNumber/cancel', ownerOnly, async (request, response) => {
    response.json(await adminOrderService.cancelOrder(request.params.orderNumber, request.body ?? {}));
  });
  return router;
}
