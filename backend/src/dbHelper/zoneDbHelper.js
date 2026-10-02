const activeZonesWithTowersQuery = `
  select zone.id, zone.name, zone.type,
         coalesce(
           json_agg(json_build_object('id', tower.id, 'name', tower.name) order by tower.name)
             filter (where tower.id is not null),
           '[]'
         ) as towers
  from zones zone
  left join towers tower on tower.zone_id = zone.id
  where zone.active
  group by zone.id
  order by zone.name`;

// Active delivery zones, each with its towers (empty for local areas).
export async function findActiveZonesWithTowers(executor) {
  const result = await executor.query(activeZonesWithTowersQuery);
  return result.rows;
}

// Returns { id, type } or null.
export async function findActiveZoneById(executor, zoneId) {
  const result = await executor.query('select id, type from zones where id = $1 and active', [zoneId]);
  return result.rows[0] ?? null;
}

export async function isTowerInZone(executor, towerId, zoneId) {
  const result = await executor.query('select 1 from towers where id = $1 and zone_id = $2', [towerId, zoneId]);
  return result.rowCount > 0;
}
