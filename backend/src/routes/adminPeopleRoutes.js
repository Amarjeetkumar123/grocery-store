import { Router } from 'express';
import { requireRole } from '../authentication.js';

// Owner only: the team and the customers.
export function createAdminPeopleRouter({ peopleService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');

  router.get('/staff', ownerOnly, async (request, response) => response.json(await peopleService.listStaff()));
  router.post('/staff', ownerOnly, async (request, response) => {
    response.status(201).json(await peopleService.addStaffMember(request.body ?? {}));
  });
  router.put('/staff/:staffId', ownerOnly, async (request, response) => {
    response.json(await peopleService.saveStaffMember(request.staffMember, request.params.staffId, request.body ?? {}));
  });
  // ?search=riya
  router.get('/customers', ownerOnly, async (request, response) => response.json(await peopleService.listCustomers(request.query)));
  router.put('/customers/:customerId', ownerOnly, async (request, response) => {
    response.json(await peopleService.saveCustomerFlags(request.params.customerId, request.body ?? {}));
  });
  return router;
}
