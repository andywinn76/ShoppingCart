-- ============================================================================
-- My Shop -- Supabase schema
-- Paste this into the Supabase SQL editor and run it once.
-- ============================================================================

-- Helpful extensions
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: extra fields per user (NextAuth stores credentials separately)
-- We key by email so it works with credentials + OAuth alike.
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  name         text,
  password_hash text,                      -- only set for credential signups
  is_admin     boolean not null default false,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_email_idx on profiles (email);

-- ----------------------------------------------------------------------------
-- addresses: shipping/billing addresses tied to a profile
-- ----------------------------------------------------------------------------
create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  label       text,                          -- e.g. "Home", "Work"
  full_name   text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  region      text not null,                 -- state/province
  postal_code text not null,
  country     text not null default 'US',
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_profile_idx on addresses (profile_id);

-- ----------------------------------------------------------------------------
-- categories: simple taxonomy
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique,
  name  text not null
);

-- ----------------------------------------------------------------------------
-- products: master record per SKU family
-- ----------------------------------------------------------------------------
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  category_id     uuid references categories(id) on delete set null,
  product_type    text not null default 'physical'   -- 'physical' | 'digital'
                    check (product_type in ('physical','digital')),
  base_price_cents integer not null default 0,
  currency        text not null default 'usd',
  active          boolean not null default true,
  -- For digital products: where to deliver from. Use a signed URL at fulfillment.
  digital_file_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_slug_idx on products (slug);
create index if not exists products_active_idx on products (active);

-- Full-text search helper
alter table products add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored;
create index if not exists products_search_idx on products using gin (search_tsv);

-- ----------------------------------------------------------------------------
-- product_images: many per product, ordered. URLs come from Cloudinary.
-- ----------------------------------------------------------------------------
create table if not exists product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  url          text not null,
  public_id    text,                  -- Cloudinary public_id for edits/deletes
  alt          text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists product_images_product_idx on product_images (product_id);

-- ----------------------------------------------------------------------------
-- product_variants: per-option SKUs (size/color/etc.)
-- For products without variants, create a single "default" variant.
-- ----------------------------------------------------------------------------
create table if not exists product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  sku           text unique,
  name          text not null,                 -- e.g. "Medium / Blue"
  options       jsonb not null default '{}'::jsonb, -- e.g. {"size":"M","color":"blue"}
  price_cents   integer,                       -- null = use product.base_price_cents
  inventory     integer not null default 0,    -- ignored for digital products
  weight_grams  integer,                       -- physical only
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists variants_product_idx on product_variants (product_id);

-- ----------------------------------------------------------------------------
-- orders: created in 'pending' when checkout starts; webhook flips to 'paid'
-- ----------------------------------------------------------------------------
create table if not exists orders (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid references profiles(id) on delete set null,
  email                    text not null,    -- captured even for guests
  status                   text not null default 'pending'
                             check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  subtotal_cents           integer not null default 0,
  shipping_cents           integer not null default 0,
  tax_cents                integer not null default 0,
  total_cents              integer not null default 0,
  currency                 text not null default 'usd',
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  shipping_address         jsonb,
  billing_address          jsonb,
  notes                    text,
  created_at               timestamptz not null default now(),
  paid_at                  timestamptz,
  fulfilled_at             timestamptz
);
create index if not exists orders_profile_idx on orders (profile_id);
create index if not exists orders_email_idx on orders (email);
create index if not exists orders_status_idx on orders (status);

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete set null,
  product_id    uuid references products(id) on delete set null,
  -- snapshot fields so the order line is stable even if the product changes:
  product_name  text not null,
  variant_name  text,
  unit_price_cents integer not null,
  quantity      integer not null check (quantity > 0),
  line_total_cents integer not null
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ----------------------------------------------------------------------------
-- reviews: tied to a verified order item ideally; we enforce one per
-- (profile, product) and require profile_id for now (no anonymous reviews).
-- ----------------------------------------------------------------------------
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  title        text,
  body         text,
  created_at   timestamptz not null default now(),
  unique (product_id, profile_id)
);
create index if not exists reviews_product_idx on reviews (product_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- We mostly access these tables from the server using the SERVICE ROLE key,
-- so RLS exists as a belt-and-suspenders measure for the anon key.
-- Enable RLS and only allow safe public reads.
-- ----------------------------------------------------------------------------
alter table products          enable row level security;
alter table product_variants  enable row level security;
alter table product_images    enable row level security;
alter table categories        enable row level security;
alter table reviews           enable row level security;
alter table profiles          enable row level security;
alter table addresses         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;

-- Public read of active catalog
drop policy if exists "products are public" on products;
create policy "products are public" on products
  for select using (active = true);

drop policy if exists "variants are public" on product_variants;
create policy "variants are public" on product_variants
  for select using (active = true);

drop policy if exists "images are public" on product_images;
create policy "images are public" on product_images
  for select using (true);

drop policy if exists "categories are public" on categories;
create policy "categories are public" on categories
  for select using (true);

drop policy if exists "reviews are public" on reviews;
create policy "reviews are public" on reviews
  for select using (true);

-- Everything else: writes are server-only via the service role key, which
-- bypasses RLS by design. We deliberately add NO policies for inserts/updates
-- on protected tables.

-- ----------------------------------------------------------------------------
-- Explicit grants for service_role
-- When tables are created via the SQL editor (not the Supabase dashboard UI),
-- service_role does not automatically receive table-level privileges.
-- These grants are required for API routes that use the service role key.
-- ----------------------------------------------------------------------------
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Ensure future tables get the same grants automatically.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- ----------------------------------------------------------------------------
-- Seed data: a couple of categories so the storefront isn't empty.
-- ----------------------------------------------------------------------------
insert into categories (slug, name) values
  ('apparel', 'Apparel'),
  ('accessories', 'Accessories'),
  ('digital', 'Digital')
on conflict (slug) do nothing;
