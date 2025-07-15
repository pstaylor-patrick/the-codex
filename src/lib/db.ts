
import { Pool, type PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL environment variable is not set. Please ensure it is configured in your .env file or environment variables.');
  throw new Error('DATABASE_URL environment variable is not set. Application cannot connect to the database.');
} else {
  // Log only a part of it for security, or just confirm it's set
  console.log('DATABASE_URL is set, attempting to connect to PostgreSQL.');
}

// Determine SSL configuration based on environment
// For production environments (like GCP), require SSL without rejecting unauthorized certs by default.
// For development, allow less strict SSL settings for local self-signed certificates.
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = isProduction
  ? { ssl: true } // Standard SSL for production (e.g., Cloud SQL)
  : { ssl: { rejectUnauthorized: false } }; // For local dev with self-signed certs

// Create a single pool instance for the application
const pool = new Pool({
  connectionString,
  ...sslConfig,
  // Optional: add more pool configuration if needed, e.g., max connections
  // max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

pool.on('error', (err: any, client: any) => {
  console.error('Unexpected error on idle client in PostgreSQL pool:', err);
  // process.exit(-1); // Decide if errors on idle clients should terminate the app
});

// Export a function to get a client from the pool
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error acquiring client from PostgreSQL pool:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Optional: Graceful shutdown (though Next.js might handle this differently)
// async function shutdown() {
//   console.log('Shutting down database pool...');
//   await pool.end();
//   console.log('Database pool closed.');
// }

// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);
