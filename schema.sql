-- MCPX Marketplace Schema for Supabase
-- Run this in the Supabase SQL editor
-- Aligned with server/db.js (SQLite) — table names, columns, and Stripe fields match.

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Categories ───────────────────────────────────────────────────────────────
create table if not exists categories (
  id          text primary key,
  label       text not null,
  icon        text,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ─── Users (mirrors Supabase auth.users) ─────────────────────────────────────
create table if not exists users (
  id                     uuid primary key references auth.users(id) on delete cascade,
  username               text unique not null,
  display_name           text,
  avatar_url             text,
  github_url             text,
  bio                    text,
  tier                   text not null default 'starter' check (tier in ('starter','pro','enterprise')),
  -- Stripe: platform subscription
  stripe_customer_id     text,
  -- Stripe Connect: publisher payout account
  stripe_account_id      text,
  stripe_onboarding_done boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, display_name, avatar_url, github_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'html_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Servers (was "tools" — renamed to match SQLite backend) ─────────────────
create table if not exists servers (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  author_id        uuid references users(id) on delete set null,
  author_name      text not null,
  category_id      text references categories(id),
  description      text not null,
  long_description text,
  repo_url         text,
  -- Pricing
  price_type       text not null default 'free' check (price_type in ('free', 'paid')),
  price_amount     integer default 0,     -- in cents, matches SQLite schema
  price_label      text default 'free',
  -- Meta
  verified         boolean default false,
  repo_verified    boolean default false,   -- proven repo ownership → full provenance
  verify_token     text,                    -- per-server .mcpx-verify challenge token
  install_command  text,                    -- verifiable install spec (CLI + web)
  trending         boolean default false,
  tags             text[]  default '{}',
  gradient         text not null default 'linear-gradient(135deg,#4DFFB4,#4D9FFF)',
  installs         integer default 0,
  rating           numeric(3,2) default 0,
  rating_count     integer default 0,
  weekly_growth    text default '+0%',
  monthly_revenue  integer default 0,    -- in cents
  status           text not null default 'active' check (status in ('active','inactive','pending')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists servers_updated_at on servers;
create trigger servers_updated_at
  before update on servers
  for each row execute procedure update_updated_at();

-- ─── Reviews ──────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid references servers(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now(),
  unique(server_id, user_id)
);

-- Recompute server rating + rating_count after review insert/delete/update
create or replace function refresh_server_rating()
returns trigger language plpgsql as $$
begin
  update servers set
    rating       = (select coalesce(round(avg(rating)::numeric, 2), 0) from reviews where server_id = coalesce(new.server_id, old.server_id)),
    rating_count = (select count(*) from reviews where server_id = coalesce(new.server_id, old.server_id))
  where id = coalesce(new.server_id, old.server_id);
  return null;
end;
$$;

drop trigger if exists reviews_rating_refresh on reviews;
create trigger reviews_rating_refresh
  after insert or update or delete on reviews
  for each row execute procedure refresh_server_rating();

-- ─── Installs ─────────────────────────────────────────────────────────────────
create table if not exists installs (
  id           uuid primary key default gen_random_uuid(),
  server_id    uuid references servers(id) on delete cascade,
  user_id      uuid references users(id) on delete set null,
  installed_at timestamptz default now()
);

-- Adoption integrity: at most one *counted* install per (server, authenticated
-- user). Anonymous installs (NULL user_id) are excluded and analytics-only, so
-- the install counter that feeds the Trust Score can't be inflated.
create unique index if not exists installs_unique_user
  on installs(server_id, user_id) where user_id is not null;

-- ─── Subscriptions ────────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references users(id) on delete cascade,
  tier                   text not null check (tier in ('starter','pro','enterprise')),
  status                 text not null default 'active' check (status in ('active','cancelled','expired')),
  stripe_subscription_id text,
  created_at             timestamptz default now(),
  expires_at             timestamptz  -- NULL = no expiry (free tier)
);

-- ─── Source scans (latest per server; bound into the Trust Score) ────────────
create table if not exists server_scans (
  server_id     uuid primary key references servers(id) on delete cascade,
  score         integer not null,
  tier          text not null,
  finding_count integer not null default 0,
  scanned_at    timestamptz default now()
);

-- ─── Sales (completed paid-tool purchases; powers publisher revenue) ─────────
create table if not exists sales (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid references servers(id) on delete cascade,
  buyer_id    uuid references users(id) on delete set null,
  gross_cents integer not null,
  fee_cents   integer not null,
  created_at  timestamptz default now()
);
create index if not exists idx_sales_server on sales(server_id);

-- ─── Audit events (server-managed; no client RLS access) ─────────────────────
-- Persistent trail of admin actions, auth failures and safety-sensitive writes.
create table if not exists audit_events (
  id         bigserial primary key,
  action     text not null,
  actor      text,
  details    jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_audit_created on audit_events(created_at);

-- ─── Revoked tokens (logout / JWT revocation) ────────────────────────────────
create table if not exists revoked_tokens (
  jti        text primary key,
  user_id    uuid,
  revoked_at timestamptz default now(),
  expires_at timestamptz
);
create index if not exists idx_revoked_expires on revoked_tokens(expires_at);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table servers       enable row level security;
alter table users         enable row level security;
alter table reviews       enable row level security;
alter table categories    enable row level security;
alter table installs      enable row level security;
alter table subscriptions enable row level security;

-- Servers
create policy "Public can read active servers" on servers
  for select using (status = 'active');
create policy "Authors can insert their servers" on servers
  for insert with check (auth.uid() = author_id);
create policy "Authors can update their servers" on servers
  for update using (auth.uid() = author_id);
create policy "Authors can delete their servers" on servers
  for delete using (auth.uid() = author_id);

-- Categories
create policy "Public can read categories" on categories
  for select using (true);

-- Users
create policy "Public can read user profiles" on users
  for select using (true);
create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Reviews
create policy "Public can read reviews" on reviews
  for select using (true);
create policy "Authenticated users can submit reviews" on reviews
  for insert with check (auth.uid() = user_id);
create policy "Users can update own reviews" on reviews
  for update using (auth.uid() = user_id);
create policy "Users can delete own reviews" on reviews
  for delete using (auth.uid() = user_id);

-- Installs
create policy "Users can read own installs" on installs
  for select using (auth.uid() = user_id);
create policy "Authenticated users can record installs" on installs
  for insert with check (auth.uid() = user_id);

-- Subscriptions
create policy "Users can read own subscriptions" on subscriptions
  for select using (auth.uid() = user_id);

-- ─── Seed Categories ──────────────────────────────────────────────────────────
insert into categories (id, label, icon, sort_order) values
  ('all',      'All Tools',      '◎', 0),
  ('dev',      'Developer',      '⌘', 1),
  ('data',     'Data & APIs',    '⬡', 2),
  ('ai',       'AI & ML',        '◈', 3),
  ('business', 'Business',       '▣', 4),
  ('creative', 'Creative',       '✦', 5),
  ('infra',    'Infrastructure', '⌤', 6)
on conflict (id) do nothing;
