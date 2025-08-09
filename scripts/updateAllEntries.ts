import { getClient } from '@/lib/db';
import { processAndSaveReferences } from '@/lib/api';
import { fetchAllEntries } from '@/lib/api';

async function updateAllEntries() {
    const client = await getClient();
    try {
        const allEntries = await fetchAllEntries();

        for (const entry of allEntries) {
            console.log(`Updating entry: ${entry.id} - ${entry.name}`);
            await client.query('BEGIN');

            // Reprocess references (e.g., @mentions in description)
            await processAndSaveReferences(client, entry.id, entry.description);

            await client.query('COMMIT');
        }

        console.log(`✅ Updated ${allEntries.length} entries successfully.`);
    } catch (err) {
        console.error('❌ Failed to update entries:', err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
}

updateAllEntries();
