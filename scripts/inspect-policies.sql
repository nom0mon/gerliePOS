-- Diagnostic: list the policies actually present on the tenant tables.
-- Run in the Supabase SQL editor and share the output.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual        as using_expr,
  with_check  as with_check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('businesses', 'memberships', 'menu_items', 'sales', 'business_connections')
order by tablename, cmd, policyname;
