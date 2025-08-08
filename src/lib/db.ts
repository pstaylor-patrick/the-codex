// src/lib/db.ts

import { Pool, type PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NODE_ENV === 'development' && !connectionString ||
  process.argv.includes('build') ||
  process.argv.includes('next:build');

let pool: Pool | null = null;

// Only initialize the pool if not in build time and we have a connection string
if (!isBuildTime && connectionString && connectionString !== 'client-database-url') {
  console.log('🔗 Initializing database connection pool...');

  const ssl = isProduction ? { rejectUnauthorized: false } : false;

  pool = new Pool({
    connectionString,
    ssl,

    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('connect', () => {
    console.log('✅ New database client connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  });

  pool.connect()
    .then(client => {
      console.log('✅ Database connection pool initialized successfully');
      client.release();
    })
    .catch(err => {
      console.error('❌ Failed to initialize database connection pool:', err);
    });

} else if (isBuildTime) {
  console.log('🔧 Build time: skipping database connection setup');
} else if (!connectionString) {
  console.error('❌ CRITICAL: DATABASE_URL is not set in the environment.');
} else if (connectionString === 'client-database-url') {
  console.error('❌ CRITICAL: DATABASE_URL appears to be a placeholder value, not an actual connection string.');
}

/**
 * Acquires a PostgreSQL client from the connection pool.
 */
export async function getClient(): Promise<PoolClient> {
  if (isBuildTime) {
    throw new Error('Database not available during build time');
  }

  if (!connectionString || connectionString === 'client-database-url') {
    throw new Error('DATABASE_URL is missing or invalid. Cannot connect to the database.');
  }

  if (!pool) {
    throw new Error('Database pool not initialized. This might be a configuration issue.');
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('❌ Failed to acquire client from PostgreSQL pool:', err);
    console.error('Connection string (masked):', connectionString?.replace(/\/\/.*@/, '//***:***@'));
    throw err;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    console.log('🔌 Closing database connection pool...');
    await pool.end();
    pool = null;
  }
}
