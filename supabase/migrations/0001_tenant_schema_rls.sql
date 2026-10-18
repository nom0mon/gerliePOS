-- =============================================================================
-- Phase 1 — Multi-tenant schema + Row-Level Security (RLS)
-- Run this in the Supabase SQL editor (SQL → New query → paste → Run).
--
-- Model:
--   businesses            one row per vendor/stall (the tenant).
--   memberships           which auth user belongs to which business + role.
--   business_connections  RESERVED social graph (vendor ↔ vendor). Schema only
--                         in Phase 1; no app feature consumes it yet.
--   menu_items, sales     operational data that syncs to each device.
--
-- Isolation: every operational row carries business_id. RLS policies allow a
-- row only when the current auth user is a member of that business, so the
-- database enforces tenant isolation even if a client query forgets a filter.
-- =============================================================================

-- Needed for gen_random_uuid().
create extension if not exists pgcrypto;

-- Role a member holds within a business.
do $$ begin
  create type membership_role as enum ('owner', 'cashier');
exception when duplicate_object then null;
end $$;

-- --------------------------------------------------------------------------
-- Core tenant tables
-- --------------------------------------------------------------------------
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         membership_role not null default 'owner',
  created_at   timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_business_idx on public.memberships (business_id);

-- RESERVED: vendor-to-vendor connections (the future "connect with other
-- businesses" graph). Present so the model is stable; no UI uses it in Phase 1.
create table if not exists public.business_connections (
  id                    uuid primary key default gen_random_uuid(),
  requester_business_id uuid not null references public.businesses (id) on delete cascade,
  addressee_business_id uuid not null references public.businesses (id) on delete cascade,
  status                text not null default 'pending'
                          check (status in ('pending', 'accepted', 'blocked')),
  created_at            timestamptz not null default now(),
  unique (requester_business_id, addressee_business_id),
  check (requester_business_id <> addressee_business_id)
);

-- --------------------------------------------------------------------------
-- Operational tables (mirror the client domain; synced per business)
-- JSON columns keep the flexible shapes (modifier groups, sale line items)
-- without over-modelling in Phase 1.
-- --------------------------------------------------------------------------
create table if not exists public.menu_items (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses (id) on delete cascade,
  name                 text not null,
  category             text not null,
  base_price           numeric not null default 0,
  available            boolean not null default true,
  modifier_groups      jsonb not null default '[]'::jsonb,
  track_stock          boolean not null default false,
  stock_qty            integer,
  low_stock_threshold  integer,
  updated_at           timestamptz not null default now(),
  deleted              boolean not null default false
);
create index if not exists menu_items_business_idx on public.menu_items (business_id);

create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  ts            timestamptz not null default now(),
  date_key      text not null,
  items         jsonb not null default '[]'::jsonb,
  total         numeric not null default 0,
  payment_type  text not null,
  voided        boolean not null default false,
  voided_at     timestamptz,
  updated_at    timestamptz not null default now(),
  deleted       boolean not null default false
);
create index if not exists sales_business_idx on public.sales (business_id);
create index if not exists sales_date_idx on public.sales (business_id, date_key);

-- --------------------------------------------------------------------------
-- Helper: businesses the current auth user belongs to.
-- SECURITY DEFINER so the policies can consult memberships without recursing
-- into memberships' own RLS. search_path pinned for safety.
-- --------------------------------------------------------------------------
create or replace function public.current_user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.memberships where user_id = auth.uid();
$$;

create or replace function public.is_business_owner(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and business_id = bid and role = 'owner'
  );
$$;

-- --------------------------------------------------------------------------
-- Enable RLS (default-deny) on every table.
-- --------------------------------------------------------------------------
alter table public.businesses           enable row level security;
alter table public.memberships          enable row level security;
alter table public.business_connections enable row level security;
alter table public.menu_items           enable row level security;
alter table public.sales                enable row level security;

-- businesses: a user sees/updates only businesses they belong to. Any
-- authenticated user may create a business (they then add their own membership).
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select using (id in (select public.current_user_business_ids()));

drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert with check (auth.uid() is not null);

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update using (public.is_business_owner(id));

-- memberships: a user sees their own membership rows and can insert their own
-- (used to bootstrap ownership right after creating a business).
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select using (user_id = auth.uid());

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships
  for insert with check (user_id = auth.uid());

-- business_connections (reserved): visible to either side; a business may
-- request a connection only from a business it owns.
drop policy if exists connections_select on public.business_connections;
create policy connections_select on public.business_connections
  for select using (
    requester_business_id in (select public.current_user_business_ids())
    or addressee_business_id in (select public.current_user_business_ids())
  );

drop policy if exists connections_insert on public.business_connections;
create policy connections_insert on public.business_connections
  for insert with check (
    requester_business_id in (select public.current_user_business_ids())
  );

-- Operational tables: full CRUD limited to rows of a business the user belongs
-- to. One policy per table covering all commands via USING + WITH CHECK.
drop policy if exists menu_items_all on public.menu_items;
create policy menu_items_all on public.menu_items
  for all
  using (business_id in (select public.current_user_business_ids()))
  with check (business_id in (select public.current_user_business_ids()));

drop policy if exists sales_all on public.sales;
create policy sales_all on public.sales
  for all
  using (business_id in (select public.current_user_business_ids()))
  with check (business_id in (select public.current_user_business_ids()));
