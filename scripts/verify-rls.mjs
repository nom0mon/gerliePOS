/**
 * RLS tenant-isolation verification (Task 4).
 *
 * Proves against the LIVE Supabase project that:
 *   - a user can create a business, their own membership, and menu items;
 *   - two different users are isolated: each sees only their own business data;
 *   - a cross-tenant read returns nothing (RLS default-deny holds).
 *
 * This is a manual/CI check, not part of the Vitest unit suite (it needs the
 * network + real auth). Run with:  node scripts/verify-rls.mjs
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment or .env.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  } catch {
    /* .env optional if vars already exported */
  }
  return env;
}

const env = loadEnv();
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(2);
}

const fresh = () => createClient(URL_, KEY, { auth: { persistSession: false } });
const stamp = Date.now();
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('PASS:', msg);
  }
};

async function makeUser(label) {
  const c = fresh();
  // Stable per-day email so reruns reuse the same user instead of creating new
  // ones (avoids the signup rate limit). Password is fixed for the test user.
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const email = `kaffeed.rls.${label}.${day}@gmail.com`;
  const password = 'Test-Passw0rd-123!';

  let { data, error } = await c.auth.signUp({ email, password });
  // If the user already exists from a previous run, just sign in.
  if (error && /already|registered|exists/i.test(error.message)) {
    ({ data, error } = await c.auth.signInWithPassword({ email, password }));
  }
  if (error) throw new Error(`auth(${label}): ${error.message}`);
  if (!data.session) {
    throw new Error(
      `auth(${label}) returned no session — "Confirm email" is still ON in ` +
        'Supabase Auth settings. Turn it off (mailer_autoconfirm) for this test.'
    );
  }
  const userId = data.user?.id ?? data.session.user?.id;
  if (!userId) throw new Error(`auth(${label}): could not resolve user id`);
  // Ensure the client carries this session on all PostgREST calls so RLS sees
  // auth.uid(). With persistSession:false we set it explicitly to be safe.
  await c.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  return { client: c, email, userId, token: data.session.access_token };
}

async function bootstrapBusiness(client, name) {
  const { data: biz, error: bErr } = await client
    .from('businesses')
    .insert({ name })
    .select()
    .single();
  if (bErr) throw new Error(`create business: ${bErr.message}`);
  const { error: mErr } = await client
    .from('memberships')
    .insert({ business_id: biz.id, role: 'owner' });
  // user_id defaults? No — set explicitly from the session user.
  if (mErr) throw new Error(`create membership: ${mErr.message}`);
  return biz.id;
}

async function main() {
  const a = await makeUser('a');
  const b = await makeUser('b');
  const aUser = a.userId;
  const bUser = b.userId;

  // Business A
  const { data: bizA, error: bizAErr } = await a.client
    .from('businesses')
    .insert({ name: `A-${stamp}` })
    .select()
    .single();
  if (bizAErr || !bizA) throw new Error(`create business A: ${bizAErr?.message}`);
  await a.client
    .from('memberships')
    .insert({ business_id: bizA.id, user_id: aUser, role: 'owner' });
  const aItemName = `A-Latte-${stamp}`;
  await a.client.from('menu_items').insert({
    business_id: bizA.id,
    name: aItemName,
    category: 'Drinks',
    base_price: 60,
  });

  // Business B
  const { data: bizB, error: bizBErr } = await b.client
    .from('businesses')
    .insert({ name: `B-${stamp}` })
    .select()
    .single();
  if (bizBErr || !bizB) throw new Error(`create business B: ${bizBErr?.message}`);
  await b.client
    .from('memberships')
    .insert({ business_id: bizB.id, user_id: bUser, role: 'owner' });
  const bItemName = `B-Burger-${stamp}`;
  await b.client.from('menu_items').insert({
    business_id: bizB.id,
    name: bItemName,
    category: 'Food',
    base_price: 45,
  });

  // A sees its own new item and never any of B's items.
  const aItems = (await a.client.from('menu_items').select('name,business_id')).data ?? [];
  assert(
    aItems.some((i) => i.name === aItemName),
    'User A sees its own menu item'
  );
  assert(
    aItems.every((i) => i.business_id === bizA.id),
    `User A sees only rows from its own business (saw ${aItems.length} rows, all A's)`
  );
  assert(
    !aItems.some((i) => i.name === bItemName),
    "User A never sees B's menu item"
  );

  // B likewise.
  const bItems = (await b.client.from('menu_items').select('name,business_id')).data ?? [];
  assert(
    bItems.some((i) => i.name === bItemName) &&
      bItems.every((i) => i.business_id === bizB.id),
    'User B sees only its own menu items'
  );

  // A cannot read B's rows even when filtering explicitly by B's business_id.
  const crossRead =
    (await a.client.from('menu_items').select('name').eq('business_id', bizB.id))
      .data ?? [];
  assert(crossRead.length === 0, 'User A cross-tenant read of B returns nothing');

  // A cannot write into B's business (RLS WITH CHECK must reject).
  const { error: crossWrite } = await a.client
    .from('menu_items')
    .insert({ business_id: bizB.id, name: 'HACK', category: 'x', base_price: 1 });
  assert(crossWrite != null, 'User A cross-tenant insert into B is rejected');

  // A sees only its own business rows (never B's).
  const aBiz = (await a.client.from('businesses').select('id')).data ?? [];
  assert(
    aBiz.every((row) => row.id !== bizB.id) && aBiz.some((row) => row.id === bizA.id),
    "User A sees its own business and not B's"
  );
}

main()
  .then(() => {
    if (process.exitCode === 1) {
      console.error('\nRLS verification FAILED.');
    } else {
      console.log('\nRLS verification PASSED — tenant isolation holds.');
    }
  })
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(2);
  });
