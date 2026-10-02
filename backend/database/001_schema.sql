-- Grocery store database. Run once on an empty database
-- (Supabase: SQL Editor -> paste -> Run).
--
-- Only the Express server talks to these tables (as the table owner).
-- Row level security is switched on with no policies, so Supabase's
-- public Data API (the browser keys) can read or write nothing.

-- ── Store ───────────────────────────────────────────────────────────

create table store_settings (
  id              int primary key default 1 check (id = 1),  -- single row
  store_name      text not null default 'Grocery Store',
  store_latitude       numeric(9,6) check (store_latitude between -90 and 90),
  store_longitude       numeric(9,6) check (store_longitude between -180 and 180),
  max_delivery_distance_km numeric(5,2) not null default 3 check (max_delivery_distance_km > 0),
  upi_id          text,
  whatsapp_number text,
  check ((store_latitude is null) = (store_longitude is null))
);
insert into store_settings (id) values (1);

-- ── Delivery zones ──────────────────────────────────────────────────

create table zones (
  id                  bigint generated always as identity primary key,
  name                text not null unique,
  type                text not null check (type in ('society', 'locality')),
  active              boolean not null default true,
  min_order_value     numeric(10,2) not null default 0 check (min_order_value >= 0),
  delivery_charge     numeric(10,2) not null default 0 check (delivery_charge >= 0),
  free_delivery_above numeric(10,2) check (free_delivery_above >= 0),
  created_at          timestamptz not null default now(),
  unique (id, type)  -- lets addresses prove which zone type they belong to
);

create table towers (
  id      bigint generated always as identity primary key,
  zone_id bigint not null references zones(id) on delete cascade,
  name    text not null,
  unique (zone_id, name),
  unique (id, zone_id)  -- lets addresses prove the tower is in their zone
);

-- days: 0 = Sunday ... 6 = Saturday.
-- cutoff_minutes_before: e.g. a 7:00 AM slot with a 10 PM cutoff the
-- night before = 540 minutes.
create table slots (
  id                    bigint generated always as identity primary key,
  zone_id               bigint not null references zones(id) on delete cascade,
  name                  text not null,
  days                  smallint[] not null
                        check (cardinality(days) > 0 and days <@ array[0,1,2,3,4,5,6]::smallint[]),
  start_time            time not null,
  end_time              time not null check (end_time > start_time),
  cutoff_minutes_before int not null check (cutoff_minutes_before >= 0),
  max_orders            int not null check (max_orders > 0),
  active                boolean not null default true
);

-- ── People ──────────────────────────────────────────────────────────

-- Staff are matched to their Google login by email on first sign-in.
create table staff (
  id         bigint generated always as identity primary key,
  email      text not null unique check (email = lower(email)),
  user_id    uuid unique,
  name       text not null,
  phone      text,
  role       text not null check (role in ('owner', 'packer', 'rider')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id              bigint generated always as identity primary key,
  user_id         uuid not null unique,  -- Supabase auth user id
  email           text,
  name            text not null check (length(name) between 1 and 80),
  phone           text not null check (phone ~ '^[6-9][0-9]{9}$'),
  phone_confirmed boolean not null default false,
  zone_id         bigint not null,
  zone_type       text not null,
  tower_id        bigint,
  flat_number            text,
  house_number        text,
  street          text,
  landmark        text,
  floor           text,
  latitude             numeric(9,6) check (latitude between -90 and 90),
  longitude             numeric(9,6) check (longitude between -180 and 180),
  blocked         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (zone_id, zone_type) references zones(id, type),
  foreign key (tower_id, zone_id) references towers(id, zone_id),
  check ((latitude is null) = (longitude is null)),
  check (
    (zone_type = 'society'  and tower_id is not null and flat_number is not null
                            and house_number is null and street is null and landmark is null)
 or (zone_type = 'locality' and tower_id is null and flat_number is null
                            and house_number is not null and street is not null and landmark is not null)
  )
);

-- ── Catalogue ───────────────────────────────────────────────────────

create table categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  sort_order  int not null default 0,
  coming_soon boolean not null default false
);

create table products (
  id                bigint generated always as identity primary key,
  category_id       bigint not null references categories(id),
  name              text not null,
  brand             text,
  description       text,
  manufacturer      text,
  country_of_origin text not null default 'India',
  image_path        text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table pack_sizes (
  id              bigint generated always as identity primary key,
  product_id      bigint not null references products(id) on delete cascade,
  label           text not null,  -- e.g. '5 L', '10 kg'
  maximum_retail_price             numeric(10,2) not null check (maximum_retail_price > 0),
  price           numeric(10,2) not null check (price > 0 and price <= maximum_retail_price),
  stock           int not null default 0 check (stock >= 0),
  low_stock_level int not null default 5 check (low_stock_level >= 0),
  best_before     date,
  active          boolean not null default true,
  sort_order      int not null default 0,
  unique (product_id, label)
);

-- ── Orders ──────────────────────────────────────────────────────────

-- The address is COPIED into the order, so editing a profile later
-- never changes where an old order was delivered.
create table orders (
  id              bigint generated always as identity primary key,
  order_number        bigint generated always as identity (start with 1001) unique,
  customer_id     bigint not null references customers(id),
  zone_id         bigint not null,
  zone_type       text not null,
  slot_id         bigint not null references slots(id),
  delivery_date   date not null,
  status          text not null default 'new'
                  check (status in ('new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  customer_name   text not null,
  customer_phone  text not null,
  tower_name      text,
  flat_number            text,
  house_number        text,
  street          text,
  landmark        text,
  floor           text,
  latitude             numeric(9,6),
  longitude             numeric(9,6),
  items_total     numeric(10,2) not null check (items_total > 0),
  delivery_charge numeric(10,2) not null default 0 check (delivery_charge >= 0),
  total           numeric(10,2) not null,
  payment_method  text check (payment_method in ('cash', 'upi')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  rider_id        bigint references staff(id),
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (zone_id, zone_type) references zones(id, type),
  check (total = items_total + delivery_charge),
  check ((latitude is null) = (longitude is null)),
  check ((status = 'cancelled') = (cancel_reason is not null)),
  check (
    (zone_type = 'society'  and tower_name is not null and flat_number is not null)
 or (zone_type = 'locality' and house_number is not null and street is not null and landmark is not null)
  )
);
create index orders_delivery_index on orders (delivery_date, slot_id);
create index orders_customer_index on orders (customer_id);
create index orders_status_index on orders (status);

create table order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  pack_size_id bigint not null references pack_sizes(id),
  product_name text not null,
  pack_label   text not null,
  quantity     int not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price > 0),
  unique (order_id, pack_size_id)
);

create table payments (
  id           bigint generated always as identity primary key,
  order_id     bigint not null unique references orders(id),
  method       text not null check (method in ('cash', 'upi')),
  amount       numeric(10,2) not null check (amount > 0),
  collected_by bigint not null references staff(id),
  collected_at timestamptz not null default now()
);

create table cash_handovers (
  id            bigint generated always as identity primary key,
  rider_id      bigint not null references staff(id),
  handover_date date not null,
  amount        numeric(10,2) not null check (amount > 0),
  received_by   bigint not null references staff(id),
  created_at    timestamptz not null default now()
);

-- ── Engagement ──────────────────────────────────────────────────────

create table notify_me (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  category_id bigint not null references categories(id) on delete cascade,
  zone_id     bigint not null references zones(id),
  created_at  timestamptz not null default now(),
  unique (customer_id, category_id)
);

create table push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  endpoint   text not null unique,
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

-- ── Lock the tables away from Supabase's public Data API ────────────

alter table store_settings     enable row level security;
alter table zones              enable row level security;
alter table towers             enable row level security;
alter table slots              enable row level security;
alter table staff              enable row level security;
alter table customers          enable row level security;
alter table categories         enable row level security;
alter table products           enable row level security;
alter table pack_sizes         enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
alter table cash_handovers     enable row level security;
alter table notify_me          enable row level security;
alter table push_subscriptions enable row level security;
