// src/lib/db.ts

// The following debug console.logs were helpful for troubleshooting but
// should generally be removed or commented out for a production build
// as they can clutter logs and potentially expose sensitive information.
// console.log('--- DB.TS FILE LOADED (DEBUG) ---');
// console.log('NODE_ENV:', process.env.NODE_ENV);
// console.log('DATABASE_URL (at load):', process.env.DATABASE_URL ? '***** (present)' : 'NOT PRESENT');
// console.log('--- END DB.TS LOAD DEBUG ---');

import { Pool, type PoolClient } from 'pg';
// dotenv is only needed for local development, not in production Firebase App Hosting
// import dotenv from 'dotenv';
// if (process.env.NODE_ENV !== 'production') { dotenv.config(); }

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // This error message is critical for debugging missing environment variables in production
  console.error('❌ CRITICAL: DATABASE_URL is not set in the environment.');
  throw new Error('DATABASE_URL is missing. Cannot connect to the database.');
} else {
  // This log confirms the variable is set; can be commented out for quieter logs in prod
  // console.log('✅ DATABASE_URL is set. Attempting connection...');
}

// Determine SSL configuration based on NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';
const ssl =
  isProduction
    ? { rejectUnauthorized: false } // For production, especially with Render/Heroku/Vercel or if using self-signed certs with Heroku
    : false; // For local development, or if SSL is not required/managed differently

const pool = new Pool({
  connectionString,
  ssl,
  // Optional tuning parameters for production database connections
  // max: 10,                 // maximum number of clients in the pool
  // idleTimeoutMillis: 30_000, // how long a client is allowed to remain idle before being closed
  // connectionTimeoutMillis: 2_000, // how long to wait before timing out when connecting a new client
});

pool.on('error', (err) => {
  // This is a critical error handler for unexpected issues with idle clients
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
    // This catches errors during client acquisition, crucial for robust error handling
    console.error('❌ Failed to acquire client from PostgreSQL pool:', err);
    throw err; // Re-throw the error so the calling function can handle it
  }
}