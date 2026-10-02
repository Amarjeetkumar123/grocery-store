import { Router } from 'express';

// Everything here needs a signed-in user (see application.js).
export function createAccountRouter({ accountService }) {
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
  return router;
}
