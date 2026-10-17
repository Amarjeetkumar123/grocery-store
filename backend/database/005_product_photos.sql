-- Several photos per product; the first is the cover (kept in products.image_path too).
-- Run once on a database created before this file existed, after 004
-- (Supabase: SQL Editor -> paste -> Run). Safe to run again.

create table if not exists product_photos (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  image_path  text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists product_photos_product_index on product_photos (product_id, sort_order);
alter table product_photos enable row level security;

-- Each product's existing photo becomes its first (cover) photo.
insert into product_photos (product_id, image_path)
select product.id, product.image_path from products product
where product.image_path is not null
  and not exists (select 1 from product_photos photo where photo.product_id = product.id);
