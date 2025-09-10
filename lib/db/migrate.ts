import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  // Skip migrations during Vercel builds or when explicitly disabled
  if (process.env.VERCEL === '1' || process.env.SKIP_MIGRATE_ON_BUILD === '1') {
    console.log('ℹ️  Skipping migrations (VERCEL or SKIP_MIGRATE_ON_BUILD set)');
    process.exit(0);
  }

  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
