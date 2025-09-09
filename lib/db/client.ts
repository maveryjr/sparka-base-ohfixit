import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create a single connection to the database
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
}

// Disable prepared statements for Vercel Edge Functions
const client = postgres(connectionString, { prepare: false });

// Create the Drizzle instance with the database schema
export const db = drizzle(client, { schema });

// Export types
export * from './schema';

export type Database = typeof db;
