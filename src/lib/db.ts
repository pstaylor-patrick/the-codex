import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {

  console.error('❌ CRITICAL: DATABASE_URL is not set in the environment.');
  throw new Error('DATABASE_URL is missing. Cannot connect to the database.');
} else {
  console.log('✅ DATABASE_URL is set. Attempting connection...');
}

// Determine SSL configuration
const isProduction = process.env.NODE_ENV === 'production';
const ssl =
  isProduction
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Acquires a PostgreSQL client from the connection pool.
 */
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('❌ Failed to acquire client from PostgreSQL pool:', err);
    throw err;
  }
}
