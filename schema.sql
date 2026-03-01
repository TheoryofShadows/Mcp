-- MCPX Marketplace Schema for Supabase
-- Run this in the Supabase SQL editor

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Categories ───────────────────────────────────────────────────────────────
create table if not exists categories (
  id          text primary key,
  label       text not null,
  icon        text,
  description text,
  created_at  timestamptz default now()
);

-- ─── Users (mirrors Supabase auth.users) ─────────────────────────────────────
create table if not exists users (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  display_name     text,
  avatar_url       text,
  github_url       text,
  bio              text,
  stripe_account_id text,  -- Stripe Connect account for payouts
  created_at       timestamptz default now()
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

-- ─── Tools ────────────────────────────────────────────────────────────────────
create table if not exists tools (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  author_id       uuid references users(id) on delete set null,
  author_name     text not null,
  category_id     text references categories(id),
  description     text not null,
  readme          text,
  github_url      text,
  install_command text,
  -- Pricing
  price_type      text not null default 'free' check (price_type in ('free', 'paid')),
  price_amount    numeric(10,2),
  price_label     text,
  -- Stripe (populated after Stripe Connect setup)
  stripe_product_id text,   -- TODO: set via Stripe dashboard
  stripe_price_id   text,   -- TODO: set via Stripe dashboard
  -- Meta
  verified        boolean default false,
  trending        boolean default false,
  tags            text[]  default '{}',
  gradient        text,
  installs        integer default 0,
  rating          numeric(3,2) default 0,
  review_count    integer default 0,
  weekly_growth   text,
  revenue_monthly numeric(10,2),
  published       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tools_updated_at on tools;
create trigger tools_updated_at
  before update on tools
  for each row execute procedure update_updated_at();

-- ─── Reviews ──────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  tool_id    uuid references tools(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz default now(),
  unique(tool_id, user_id)
);

-- Recompute tool rating + review_count after review insert/delete/update
create or replace function refresh_tool_rating()
returns trigger language plpgsql as $$
begin
  update tools set
    rating       = (select coalesce(round(avg(rating)::numeric, 2), 0) from reviews where tool_id = coalesce(new.tool_id, old.tool_id)),
    review_count = (select count(*) from reviews where tool_id = coalesce(new.tool_id, old.tool_id))
  where id = coalesce(new.tool_id, old.tool_id);
  return null;
end;
$$;

drop trigger if exists reviews_rating_refresh on reviews;
create trigger reviews_rating_refresh
  after insert or update or delete on reviews
  for each row execute procedure refresh_tool_rating();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table tools      enable row level security;
alter table users      enable row level security;
alter table reviews    enable row level security;
alter table categories enable row level security;

-- Tools
create policy "Public can read published tools" on tools
  for select using (published = true);
create policy "Authors can insert their tools" on tools
  for insert with check (auth.uid() = author_id);
create policy "Authors can update their tools" on tools
  for update using (auth.uid() = author_id);
create policy "Authors can delete their tools" on tools
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

-- ─── Seed Categories ──────────────────────────────────────────────────────────
insert into categories (id, label, icon, description) values
  ('all',      'All Tools',      '◎', 'Browse all MCP tools'),
  ('dev',      'Developer',      '⌘', 'Code, CI/CD, and developer tools'),
  ('data',     'Data & APIs',    '⬡', 'Databases, APIs, and data pipelines'),
  ('ai',       'AI & ML',        '◈', 'Machine learning and AI integrations'),
  ('business', 'Business',       '▣', 'Payments, CRM, and productivity'),
  ('creative', 'Creative',       '✦', 'Design, media, and content tools'),
  ('infra',    'Infrastructure', '⌤', 'Cloud, DevOps, and infrastructure')
on conflict (id) do nothing;
