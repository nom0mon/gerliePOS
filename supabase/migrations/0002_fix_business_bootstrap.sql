-- =============================================================================
-- Phase 1 — Migration 0002: fix business bootstrap (chicken-and-egg)
-- Run after 0001, in the Supabase SQL editor.
--
-- Problem found during RLS verification: creating a business with
-- `.insert().select()` failed because the SELECT-after-insert was denied — the
-- businesses_select policy only allowed rows the user is already a MEMBER of,
-- but membership is created *after* the business. A newly created business was
-- therefore invisible to its own creator, breaking the sign-up bootstrap.
--
-- Fix: track who created a business (`created_by`, defaulting to auth.uid()),
-- and allow the creator to see and own it even before the membership row
-- exists. Normal membership-based access is unchanged.
-- =============================================================================

alter table public.businesses
  add column if not exists created_by uuid
    references auth.users (id)
    default auth.uid();

-- SELECT: a member OR the creator may read the business.
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select using (
    id in (select public.current_user_business_ids())
    or created_by = auth.uid()
  );

-- UPDATE: an owner-member OR the creator may update.
drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update using (
    public.is_business_owner(id)
    or created_by = auth.uid()
  );

-- INSERT: any authenticated user may create a business; the row must be stamped
-- with themselves as creator (prevents spoofing created_by for someone else).
drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid())
  );
