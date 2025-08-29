import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

async function main() {
  const email = process.env.TEST_USER_EMAIL || 'test.user@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'Passw0rd!';

  // Ensure user exists and is confirmed
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }
  const found = existing.users.find((u) => u.email === email);
  if (!found) {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
      });
    if (createErr) {
      console.error('Failed to create user:', createErr.message);
      process.exit(1);
    }
    console.log('Created user:', created.user?.id, created.user?.email);
  } else {
    console.log('User already exists:', found.id, found.email);
  }

  // Try sign in with password to get tokens
  const { data: sessionData, error: signInErr } =
    await admin.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error('Sign in failed:', signInErr.message);
    process.exit(1);
  }
  console.log(
    `Access token: ${sessionData.session?.access_token?.slice(0, 16)}...`,
  );
  console.log(
    `Refresh token: ${sessionData.session?.refresh_token?.slice(0, 16)}...`,
  );
  console.log('Test URL (magic bridge compatible):');
  console.log(
    `${process.env.LOCAL_BASE_URL || 'http://localhost:3001'}/magic#access_token=${sessionData.session?.access_token}&refresh_token=${sessionData.session?.refresh_token}&type=magiclink`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
