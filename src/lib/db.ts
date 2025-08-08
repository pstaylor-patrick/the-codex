// src/lib/db.ts

import { Pool, type PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

let pool: Pool | null = null;

if (!isBuildTime && connectionString) {
  const ssl = isProduction ? { rejectUnauthorized: false } : false;

  pool = new Pool({
    connectionString,
    ssl
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });
} else if (isBuildTime) {
  console.log('🔧 Build time: skipping database connection setup');
} else if (!connectionString) {
  console.error('❌ CRITICAL: DATABASE_URL is not set in the environment.');
}

/**
 * Acquires a PostgreSQL client from the connection pool.
 */
export async function getClient(): Promise<PoolClient> {
  if (isBuildTime) {
    throw new Error('Database not available during build time');
  }

  if (!pool) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing. Cannot connect to the database.');
    }
    throw new Error('Database pool not initialized');
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('❌ Failed to acquire client from PostgreSQL pool:', err);
    throw err;
  }
}
