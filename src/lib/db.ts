// src/lib/db.ts

// --- REMOVE THESE DEBUGGING LINES FOR PROD, BUT KEEP THEM FOR NOW IF SUPPORT ASKS FOR THEM ---
// console.log('--- DB.TS FILE LOADED (DEBUG) ---');
// console.log('NODE_ENV:', process.env.NODE_ENV);
// console.log('DATABASE_URL (at load):', process.env.DATABASE_URL ? '***** (present)' : 'NOT PRESENT');
// console.log('--- END DB.TS LOAD DEBUG ---');
// --- END DEBUGGING LINES ---

import { Pool, type PoolClient } from 'pg';
// REMOVE: import dotenv from 'dotenv';
// REMOVE: if (process.env.NODE_ENV !== 'production') { dotenv.config(); }

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Your error message is already updated, which is good.
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