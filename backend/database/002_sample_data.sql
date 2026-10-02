-- Sample data for trying the app in Noida. Replace the store location,
-- societies, areas and charges with your real ones (admin screens for
-- these come in Week 3).

update store_settings
set store_name = 'Grocery Store',
    store_latitude = 28.567200, store_longitude = 77.388000,  -- Sector 76, Noida (your shop's location)
    max_delivery_distance_km = 3,
    upi_id = 'yourstore@upi',
    whatsapp_number = '9000000000';

insert into zones (name, type, min_order_value, delivery_charge, free_delivery_above) values
  ('Supertech Capetown, Sector 74', 'society',  199, 30, 499),
  ('Mahagun Moderne, Sector 78',    'society',  199, 30, 499),
  ('Sector 73 Market Area',         'locality', 299, 40, 599);

insert into towers (zone_id, name)
select zone.id, tower.name
from zones zone
cross join (values ('Tower A'), ('Tower B'), ('Tower C'), ('Tower D')) as tower(name)
where zone.name = 'Supertech Capetown, Sector 74';

insert into towers (zone_id, name)
select zone.id, tower.name
from zones zone
cross join (values ('Tower 1'), ('Tower 2'), ('Tower 3')) as tower(name)
where zone.name = 'Mahagun Moderne, Sector 78';

insert into categories (name, sort_order, coming_soon) values
  ('Oils & Ghee',          1, false),
  ('Atta & Flours',        2, false),
  ('Rice',                 3, false),
  ('Dals & Pulses',        4, false),
  ('Grains & Millets',     5, false),
  ('Fruits & Vegetables',  6, true);
