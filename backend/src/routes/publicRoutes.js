import { Router } from 'express';

// Information anyone may see without signing in.
export function createPublicRouter(database) {
  const router = Router();

  router.get('/store', async (request, response) => {
    const result = await database.query(
      'select store_name, whatsapp_number from store_settings where id = 1',
    );
    const store = result.rows[0];
    response.json({ name: store.store_name, whatsappNumber: store.whatsapp_number });
  });

  // Active delivery zones, with towers listed for societies.
  router.get('/zones', async (request, response) => {
    const result = await database.query(
      `select zone.id, zone.name, zone.type,
              coalesce(
                json_agg(json_build_object('id', tower.id, 'name', tower.name) order by tower.name)
                  filter (where tower.id is not null),
                '[]'
              ) as towers
       from zones zone
       left join towers tower on tower.zone_id = zone.id
       where zone.active
       group by zone.id
       order by zone.name`,
    );
    response.json({ zones: result.rows });
  });

  return router;
}
