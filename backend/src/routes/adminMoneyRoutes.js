import { Router } from 'express';
import { requireRole } from '../authentication.js';

// Owner only: the dashboard, the end-of-day cash check and sales reports.
export function createAdminMoneyRouter({ moneyService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');
  router.get('/dashboard', ownerOnly, async (request, response) => response.json(await moneyService.getDashboard()));
  // ?date=2026-10-03
  router.get('/cash-check', ownerOnly, async (request, response) => response.json(await moneyService.getCashCheck(request.query)));
  router.post('/cash-handovers', ownerOnly, async (request, response) => {
    response.status(201).json(await moneyService.recordHandover(request.staffMember, request.body ?? {}));
  });
  // ?from=2026-10-01&to=2026-10-31
  router.get('/reports', ownerOnly, async (request, response) => response.json(await moneyService.getSalesReport(request.query)));
  return router;
}
