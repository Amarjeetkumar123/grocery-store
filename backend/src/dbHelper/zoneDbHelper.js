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

const adminZonesQuery = `
  select zone.id, zone.name, zone.type, zone.active, zone.min_order_value, zone.delivery_charge,
         zone.free_delivery_above,
         (select count(*) from customers customer where customer.zone_id = zone.id) as customer_count,
         coalesce((select json_agg(json_build_object('id', tower.id, 'name', tower.name) order by tower.name)
                   from towers tower where tower.zone_id = zone.id), '[]') as towers
  from zones zone
  order by zone.active desc, zone.name`;

const deliverySettingsQuery = `
  select id, type, active, min_order_value, delivery_charge, free_delivery_above
  from zones where id = $1`;

function toDeliverySettings(row) {
  return {
    minimumOrderValue: row.min_order_value,
    deliveryCharge: row.delivery_charge,
    freeDeliveryAbove: row.free_delivery_above,
  };
}

// Every zone, active or not, with towers and how many customers live there.
export async function findAllZonesForAdmin(executor) {
  const result = await executor.query(adminZonesQuery);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    active: row.active,
    ...toDeliverySettings(row),
    customerCount: row.customer_count,
    towers: row.towers,
  }));
}

// { id, type, active, minimumOrderValue, deliveryCharge, freeDeliveryAbove } or null.
export async function findZoneDeliverySettings(executor, zoneId) {
  const result = await executor.query(deliverySettingsQuery, [zoneId]);
  const row = result.rows[0];
  return row ? { id: row.id, type: row.type, active: row.active, ...toDeliverySettings(row) } : null;
}

export async function insertZone(executor, zone) {
  const result = await executor.query(
    `insert into zones (name, type, active, min_order_value, delivery_charge, free_delivery_above)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [zone.name, zone.type, zone.active, zone.minimumOrderValue, zone.deliveryCharge, zone.freeDeliveryAbove],
  );
  return result.rows[0].id;
}

// The zone type never changes: addresses and orders depend on it.
export async function updateZone(executor, zoneId, zone) {
  const result = await executor.query(
    `update zones set name = $2, active = $3, min_order_value = $4, delivery_charge = $5, free_delivery_above = $6
     where id = $1`,
    [zoneId, zone.name, zone.active, zone.minimumOrderValue, zone.deliveryCharge, zone.freeDeliveryAbove],
  );
  return result.rowCount > 0;
}

// Towers belong to societies only. Returns the new id, or null for a local area or unknown zone.
export async function insertTower(executor, zoneId, name) {
  const result = await executor.query(
    `insert into towers (zone_id, name) select id, $2 from zones where id = $1 and type = 'society' returning id`,
    [zoneId, name],
  );
  return result.rows[0]?.id ?? null;
}

// Returns false when there is no such tower.
export async function deleteTower(executor, towerId) {
  const result = await executor.query('delete from towers where id = $1', [towerId]);
  return result.rowCount > 0;
}
