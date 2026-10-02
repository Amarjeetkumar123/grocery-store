import { Router } from 'express';
import { requireRole } from '../authentication.js';

// Owner only: delivery zones, towers, slots and store settings.
export function createAdminZoneRouter({ zoneService, storeService }) {
  const router = Router();
  const ownerOnly = requireRole('owner');

  router.get('/zones', ownerOnly, async (request, response) => response.json(await zoneService.listZones()));
  router.post('/zones', ownerOnly, async (request, response) => {
    response.status(201).json(await zoneService.createZone(request.body ?? {}));
  });
  router.put('/zones/:zoneId', ownerOnly, async (request, response) => {
    response.json(await zoneService.saveZone(request.params.zoneId, request.body ?? {}));
  });
  router.post('/zones/:zoneId/towers', ownerOnly, async (request, response) => {
    response.status(201).json(await zoneService.addTower(request.params.zoneId, request.body ?? {}));
  });
  router.delete('/towers/:towerId', ownerOnly, async (request, response) => {
    response.json(await zoneService.removeTower(request.params.towerId));
  });
  router.post('/zones/:zoneId/slots', ownerOnly, async (request, response) => {
    response.status(201).json(await zoneService.createSlot(request.params.zoneId, request.body ?? {}));
  });
  router.put('/slots/:slotId', ownerOnly, async (request, response) => {
    response.json(await zoneService.saveSlot(request.params.slotId, request.body ?? {}));
  });
  router.get('/store-settings', ownerOnly, async (request, response) => response.json(await storeService.getStoreSettings()));
  router.put('/store-settings', ownerOnly, async (request, response) => {
    response.json(await storeService.saveStoreSettings(request.body ?? {}));
  });
  return router;
}
