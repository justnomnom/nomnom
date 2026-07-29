/**
 * Creates a password-auth E2E user (if missing), ensures public.users + onboarding_completed_at.
 * Run: node scripts/ensure-e2e-test-user.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
config({ path: path.join(root, '.env.local') });
config({ path: path.join(root, '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

const envPath = path.join(root, '.env.local');

const E2E_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'e2e.playwright@nomnom.local';

function readPasswordFromEnvFile() {
  if (!existsSync(envPath)) return '';
  const raw = readFileSync(envPath, 'utf8');
  const m = raw.match(/^E2E_TEST_USER_PASSWORD=(.*)$/m);
  if (!m) return '';
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const fromEnvPwd = process.env.E2E_TEST_USER_PASSWORD;
const fromFilePwd = readPasswordFromEnvFile();
let E2E_PASSWORD = fromEnvPwd || fromFilePwd || '';
const passwordWasGenerated = !E2E_PASSWORD;
if (!E2E_PASSWORD) {
  E2E_PASSWORD = `E2e_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}!a`;
}

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: E2E_EMAIL,
  password: E2E_PASSWORD,
  email_confirm: true,
  user_metadata: { source: 'e2e_playwright' },
});

let userId;

if (createErr) {
  if (!String(createErr.message || '').toLowerCase().includes('already')) {
    console.error('createUser:', createErr.message);
    process.exit(1);
  }
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error('listUsers:', listErr.message);
    process.exit(1);
  }
  const u = list.users.find((x) => x.email?.toLowerCase() === E2E_EMAIL.toLowerCase());
  if (!u) {
    console.error('User exists but could not be listed:', E2E_EMAIL);
    process.exit(1);
  }
  userId = u.id;
  console.log('Existing auth user:', E2E_EMAIL, userId);
  if (passwordWasGenerated) {
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: E2E_PASSWORD,
    });
    if (updErr) {
      console.error('updateUser password:', updErr.message);
      process.exit(1);
    }
    console.log('Set generated password on existing user (no prior E2E_TEST_USER_PASSWORD).');
  }
} else {
  userId = created.user.id;
  console.log('Created auth user:', E2E_EMAIL, userId);
}

const { error: upsertErr } = await admin.from('users').upsert(
  {
    id: userId,
    email: E2E_EMAIL.toLowerCase(),
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'id' }
);

if (upsertErr) {
  console.error('users upsert:', upsertErr.message);
  process.exit(1);
}

const { data: profileRow } = await admin.from('users').select('username').eq('id', userId).maybeSingle();
const e2eUsername = profileRow?.username?.trim() || '';

if (!existsSync(envPath)) {
  console.error('No .env.local found');
  process.exit(1);
}

let raw = readFileSync(envPath, 'utf8');

const q = JSON.stringify;
const block = `
# =============================================================================
# Playwright E2E (written by scripts/ensure-e2e-test-user.mjs)
# =============================================================================
E2E_BASE_URL=http://localhost:3032
E2E_SUPABASE_URL=${q(url)}
E2E_SUPABASE_ANON_KEY=${q(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')}
E2E_SUPABASE_SERVICE_ROLE_KEY=${q(serviceKey)}
E2E_TEST_USER_EMAIL=${q(E2E_EMAIL)}
${e2eUsername ? `E2E_TEST_USER_USERNAME=${q(e2eUsername)}` : '# E2E_TEST_USER_USERNAME=   # optional: sign-in handle; set after public.users.username exists'}
E2E_TEST_USER_PASSWORD=${q(E2E_PASSWORD)}
`;

const START = '# <<< E2E_PLAYWRIGHT_BLOCK_START >>>';
const END = '# <<< E2E_PLAYWRIGHT_BLOCK_END >>>';
const wrapped = `${START}\n${block.trim()}\n${END}\n`;

if (raw.includes(START) && raw.includes(END)) {
  raw = raw.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`, 'm'), wrapped);
} else {
  raw = raw.trimEnd() + '\n\n' + wrapped;
}

writeFileSync(envPath, raw, 'utf8');

console.log('Updated .env.local with E2E_* block (password is new if user was just created).');
console.log('Email:', E2E_EMAIL);
if (e2eUsername) console.log('Username (optional Playwright sign-in):', e2eUsername);
