// src/app/api/test-db-connection/route.ts
import { getClient } from './src/lib/db'; // Adjust path if needed
import { NextResponse } from 'next/server';
import { PoolClient } from 'pg';

export async function POST(request: Request) { // Changed to POST request
    let client: PoolClient | undefined;

    console.warn('!!! DANGER ZONE !!! API Route: Attempting to DROP TABLES.');

    try {
        client = await getClient();
        await client.query('BEGIN'); // Start a transaction

        // --- Drop Tables (order matters due to foreign keys) ---
        // Drop entry_tags first as it depends on entries and tags
        await client.query('DROP TABLE IF EXISTS "entry_tags" CASCADE;');
        console.log('API Route: Dropped table "entry_tags".');

        // Drop entries table
        await client.query('DROP TABLE IF EXISTS "entries" CASCADE;');
        console.log('API Route: Dropped table "entries".');

        // Drop user_submissions table
        await client.query('DROP TABLE IF EXISTS "user_submissions" CASCADE;');
        console.log('API Route: Dropped table "user_submissions".');

        // Drop tags table
        await client.query('DROP TABLE IF EXISTS "tags" CASCADE;');
        console.log('API Route: Dropped table "tags".');

        // --- Clean pgmigrations table records ---
        // This makes node-pg-migrate "forget" that these migrations ran
        await client.query(`
            DELETE FROM "public"."pgmigrations"
            WHERE name IN (
                '1747064544503_create-tags-table',
                '1747064550000_create_entries_table',
                '1747064552223_create-user-submissions-table'
            );
        `);
        console.log('API Route: Removed related entries from "pgmigrations" table.');

        await client.query('COMMIT'); // Commit the transaction

        console.log('API Route: All specified tables dropped and pgmigrations cleaned successfully.');
        return NextResponse.json(
            { success: true, message: 'Specified tables dropped and migrations reset successfully.' },
            { status: 200 }
        );
    } catch (error: any) {
        if (client) {
            await client.query('ROLLBACK'); // Rollback on error
        }
        console.error('!!! DANGER ZONE !!! API Route: Failed to drop tables!', error);
        return NextResponse.json(
            { success: false, message: 'Failed to drop tables. Check server logs for details.', error: error.message },
            { status: 500 }
        );
    } finally {
        if (client) {
            client.release();
        }
    }
}

// You might still want a GET route for a simple connection test,
// but keep the destructive actions in POST.
// export async function GET(request: Request) {
//     let client: PoolClient | undefined;
//     try {
//         client = await getClient();
//         await client.query('SELECT NOW()');
//         console.log('API Route: Database connection test successful!');
//         return NextResponse.json({ success: true, message: 'Database connection successful.' }, { status: 200 });
//     } catch (error: any) {
//         console.error('API Route: Database connection test failed!', error);
//         return NextResponse.json(
//             { success: false, message: 'Database connection failed. Check server logs for details.', error: error.message },
//             { status: 500 }
//         );
//     } finally {
//         if (client) {
//             client.release();
//         }
//     }
// }
