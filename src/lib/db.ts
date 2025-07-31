import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ CRITICAL: DATABASE_URL is not set in .env');
  throw new Error('DATABASE_URL is missing. Cannot connect to the database.');
} else {
  console.log('✅ DATABASE_URL is set. Attempting connection...');
}

// Determine SSL configuration
const isProduction = process.env.NODE_ENV === 'production';
const ssl =
  isProduction
    ? { rejectUnauthorized: false } // Cloud SQL / hosted environments often need this
    : false; // For localhost development without SSL

const pool = new Pool({
  connectionString,
  ssl,
  // Optional tuning:
  // max: 10,
  // idleTimeoutMillis: 30_000,
  // connectionTimeoutMillis: 2_000,
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
