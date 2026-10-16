-- Ratings and reviews, and a pack type for each pack size ('1 L · Bottle').
-- Run once on a database created before this file existed
-- (Supabase: SQL Editor -> paste -> Run). Safe to run again.

alter table pack_sizes add column if not exists pack_type text;

create table if not exists product_reviews (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  customer_id bigint not null references customers(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  tags        text[] not null default '{}',
  body        text,
  pack_label  text,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, customer_id)
);
create index if not exists product_reviews_product_index on product_reviews (product_id) where not hidden;
alter table product_reviews enable row level security;
