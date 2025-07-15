
    // src/lib/api.ts
    import type { AnyEntry, ExiconEntry, LexiconEntry, Tag, UserSubmission, NewEntrySuggestionData, EditEntrySuggestionData, UserSubmissionBase, NewUserSubmission, Alias } from "./types";
    import { getClient } from "./db";
    
    // Helper to transform DB row to AnyEntry
    const transformDbRowToEntry = (row: any): AnyEntry => {
      const normalizeAliases = (aliases: any, entryId: string): Alias[] => {
        let parsedAliases: any[] = [];
        if (typeof aliases === 'string') {
          try {
            parsedAliases = JSON.parse(aliases);
          } catch (e) {
            console.warn('Failed to parse aliases string as JSON for entry:', entryId, aliases, e);
            return []; 
          }
        } else if (Array.isArray(aliases)) {
          parsedAliases = aliases;
        }
        
        if (!Array.isArray(parsedAliases)) return [];

        return parsedAliases.map((alias, i) => {
          if (typeof alias === 'string') {
            return { id: `alias-${entryId}-${i}`, name: alias.trim() };
          }
          if (alias && typeof alias.name === 'string') {
            return {
              id: String(alias.id ?? `alias-${entryId}-${i}`),
              name: alias.name.trim(),
            };
          }
          return null;
        }).filter((a): a is Alias => a !== null && a.name !== ''); 
      };
      
    
      const aliases = normalizeAliases(row.aliases, String(row.id));
    
      const baseEntry = {
        id: String(row.id),
        name: row.title, 
        description: row.definition, 
        aliases,
      };
    
      if (row.type === 'exicon') {
        const parsedTags = Array.isArray(row.tags)
          ? row.tags.filter(Boolean).map((t: any) => ({ id: String(t.id), name: t.name }))
          : [];
    
        return {
          ...baseEntry,
          type: 'exicon',
          tags: parsedTags,
          videoLink: row.video_link || undefined,
        } as ExiconEntry;
      }
    
      return { ...baseEntry, type: 'lexicon' } as LexiconEntry;
    };


    export const fetchAllEntries = async (): Promise<AnyEntry[]> => {
      const client = await getClient();
      try {
        const res = await client.query(`
          SELECT e.id, e.title, e.definition, e.type, e.aliases, e.video_link,
                 COALESCE(
                   (SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
                    FROM tags t
                    JOIN entry_tags et ON t.id = et.tag_id
                    WHERE et.entry_id = e.id),
                   '[]'::json
                 ) AS tags
          FROM entries e
          ORDER BY e.title ASC
        `);
        return res.rows.map(transformDbRowToEntry);
      } catch (err: any) {
        const errorMessage = err.message ? String(err.message).toLowerCase() : "";
        if (errorMessage.includes('relation "entries" does not exist')) {
            const detailedErrorMsg = 'CRITICAL SERVER LOG: The "entries" table was not found. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' + err.stack;
            console.error(detailedErrorMsg);
            throw new Error('DATABASE SETUP ERROR: The "entries" table is MISSING. This is NOT a code bug in this function. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.');
        }
        console.error('Error fetching all entries from database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };



    export const applyApprovedSubmissionToDatabase = async (submission: UserSubmissionBase<any>): Promise<void> => {
      const client = await getClient();
      try {
        await client.query('BEGIN'); 

        if (submission.submissionType === 'new') {
          const newEntryData = submission.data as NewEntrySuggestionData;
          const entryId = `${newEntryData.entryType}-${Date.now()}-${newEntryData.name.toLowerCase().replace(/\s+/g, '-')}`;


          const insertEntryResult = await client.query(
            'INSERT INTO entries (id, title, definition, type, aliases, video_link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [
              entryId,
              newEntryData.name, 
              newEntryData.description, 
              newEntryData.entryType,
              JSON.stringify(newEntryData.aliases?.map(a => ({ name: a })) || []), 
              newEntryData.entryType === 'exicon' ? newEntryData.videoLink || null : null,
            ]
          );
          const newEntryId = String(insertEntryResult.rows[0].id);

          if (newEntryData.entryType === 'exicon' && newEntryData.tags && newEntryData.tags.length > 0) {
            const tagNames = newEntryData.tags;
            const tagQuery = await client.query('SELECT id FROM tags WHERE name = ANY($1::text[])', [tagNames]);
            const tagIdsToLink = tagQuery.rows.map(row => String(row.id));
            
            if (tagIdsToLink.length > 0) {
              const entryTagValues = tagIdsToLink.map(tagId => `('${newEntryId}', '${tagId}')`).join(',');
              await client.query(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ${entryTagValues}`);
            }
          }
        } else if (submission.submissionType === 'edit') {
          const editEntryData = submission.data as EditEntrySuggestionData;
          const currentEntryResult = await client.query('SELECT title, definition, type, aliases, video_link FROM entries WHERE id = $1', [editEntryData.entryId]);
          if (currentEntryResult.rows.length === 0) {
            throw new Error(`Entry with ID ${editEntryData.entryId} not found for edit submission.`);
          }
          const currentDbRow = currentEntryResult.rows[0];
          
          const updatedDefinition = editEntryData.changes.description !== undefined ? editEntryData.changes.description : currentDbRow.definition;
          
          const updatedAliasesArray = editEntryData.changes.aliases !== undefined 
            ? editEntryData.changes.aliases.map(a => ({ name: a })) 
            : (typeof currentDbRow.aliases === 'string' ? JSON.parse(currentDbRow.aliases) : currentDbRow.aliases || []); 
          const updatedAliasesJson = JSON.stringify(updatedAliasesArray);

          let updatedVideoUrl = editEntryData.changes.videoLink !== undefined ? editEntryData.changes.videoLink : currentDbRow.video_link;
          if (editEntryData.entryType !== 'exicon') updatedVideoUrl = null; 

          await client.query(
            'UPDATE entries SET definition = $1, aliases = $2, video_link = $3, updated_at = NOW() WHERE id = $4',
            [
              updatedDefinition, 
              updatedAliasesJson,
              updatedVideoUrl, 
              editEntryData.entryId 
            ]
          );

          if (editEntryData.entryType === 'exicon' && editEntryData.changes.tags !== undefined) {
            await client.query('DELETE FROM entry_tags WHERE entry_id = $1', [editEntryData.entryId]);
            if (editEntryData.changes.tags.length > 0) {
                const tagNames = editEntryData.changes.tags;
                const tagQuery = await client.query('SELECT id FROM tags WHERE name = ANY($1::text[])', [tagNames]);
                const tagIdsToLink = tagQuery.rows.map(row => String(row.id));
                if (tagIdsToLink.length > 0) {
                    const entryTagValues = tagIdsToLink.map(tagId => `('${editEntryData.entryId}', '${tagId}')`).join(',');
                    await client.query(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ${entryTagValues}`);
                }
            }
          }
        } else {
            throw new Error(`Unknown submission type: ${submission.submissionType}`);
        }
        await client.query('COMMIT'); 
      } catch (err) {
        await client.query('ROLLBACK'); 
        console.error(`Error applying approved submission ${submission.id} to database:`, err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const getEntryByIdFromDatabase = async (id: string | number): Promise<AnyEntry | null> => {
      const client = await getClient();
      try {
        const queryId = String(id);
         const res = await client.query(`
          SELECT e.id, e.title, e.definition, e.type, e.aliases, e.video_link,
                 COALESCE(
                   (SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
                    FROM tags t
                    JOIN entry_tags et ON t.id = et.tag_id
                    WHERE et.entry_id = e.id),
                   '[]'::json
                 ) AS tags
          FROM entries e
          WHERE e.id = $1
        `, [queryId]);
        return res.rows.length > 0 ? transformDbRowToEntry(res.rows[0]) : null;
      } catch (err) {
        console.error(`Error fetching entry with ID ${id} from database:`, err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const fetchTagsFromDatabase = async (): Promise<Tag[]> => {
      const client = await getClient();
      try {
        const res = await client.query('SELECT id::text, name FROM tags ORDER BY name ASC'); 
        return res.rows;
      } catch (err: any) {
        const errorMessage = err.message ? String(err.message).toLowerCase() : "";
        if (errorMessage.includes('relation "tags" does not exist')) {
          const detailedErrorMsg = 'CRITICAL SERVER LOG: The "tags" table was not found. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' + err.stack;
          console.error(detailedErrorMsg);
          throw new Error('DATABASE SETUP ERROR: The "tags" table is MISSING. This is NOT a code bug in this function. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.');
        }
        console.error('Error fetching tags from database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const createTagInDatabase = async (name: string): Promise<Tag> => {
      const client = await getClient();
      try {
        const res = await client.query(
          'INSERT INTO tags (name) VALUES ($1) RETURNING id::text, name',
          [name]
        );
        return res.rows[0];
      } catch (err: any) {
        if (err.code === '23505') { // Unique violation
          throw new Error(`Tag "${name}" already exists.`);
        }
        console.error('Error creating tag in database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const updateTagInDatabase = async (id: string, name: string): Promise<Tag> => {
      const client = await getClient();
      try {
        const res = await client.query('UPDATE tags SET name = $1 WHERE id = $2 RETURNING id::text, name', [name, id]);
        if (res.rows.length === 0) {
          throw new Error(`Tag with ID ${id} not found for update.`);
        }
        return res.rows[0];
      } catch (err: any) {
        if (err.code === '23505') { 
          throw new Error(`Another tag with name "${name}" already exists.`);
        }
        console.error('Error updating tag in database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const deleteTagFromDatabase = async (id: string): Promise<void> => {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM entry_tags WHERE tag_id = $1', [id]);
        const res = await client.query('DELETE FROM tags WHERE id = $1', [id]);
        if (res.rowCount === 0) {
            console.warn(`Tag with ID ${id} not found for deletion, or was already deleted.`);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting tag from database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const fetchPendingSubmissionsFromDatabase = async (): Promise<UserSubmissionBase<any>[]> => {
      const client = await getClient();
      try {
        const res = await client.query("SELECT id, submission_type, data, submitter_name, submitter_email, status, timestamp::text FROM user_submissions WHERE status = 'pending' ORDER BY timestamp ASC");
        return res.rows.map(row => ({
          id: Number(row.id),
          submissionType: row.submission_type,
          data: row.data, 
          submitterName: row.submitter_name,
          submitterEmail: row.submitter_email,
          status: row.status,
          timestamp: row.timestamp, 
        }));
      } catch (err) {
        console.error('Error fetching pending submissions from database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const createSubmissionInDatabase = async (submission: NewUserSubmission<any>): Promise<UserSubmissionBase<any>> => {
      const client = await getClient();
      try {
        const { submissionType, data, submitterName, submitterEmail } = submission;
        if (data.aliases && Array.isArray(data.aliases) && data.aliases.every((a: any) => typeof a === 'string')) {
          data.aliases = data.aliases.map((name: string) => ({ name })); 
        }
        const res = await client.query(
          'INSERT INTO user_submissions (submission_type, data, submitter_name, submitter_email, status, timestamp) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, submission_type, data, submitter_name, submitter_email, status, timestamp::text',
          [submissionType, data, submitterName, submitterEmail, 'pending']
        );
        const newSubmission = res.rows[0];
        return {
            ...newSubmission,
            id: Number(newSubmission.id),
            data: newSubmission.data,
        };
      } catch (err) {
        console.error('Error creating submission in database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };

    export const updateSubmissionStatusInDatabase = async (id: number, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
      const client = await getClient();
      try {
        const res = await client.query('UPDATE user_submissions SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        if (res.rowCount === 0) {
            console.warn(`Submission with ID ${id} not found for status update.`);
        }
      } catch (err) {
        console.error('Error updating submission status in database:', err);
        throw err;
      } finally { if (client) client.release(); }
    };


    export const updateEntryInDatabase = async (entry: AnyEntry): Promise<AnyEntry> => {
      const client = await getClient();
      try {
        await client.query('BEGIN');
    
        const { id, name, description, type } = entry;
        const videoLink = (type === 'exicon') ? (entry as ExiconEntry).videoLink || null : null;
        
        const aliasesToStore = Array.isArray(entry.aliases)
          ? entry.aliases.map(alias => (typeof alias === 'string' ? { name: alias } : alias))
          : [];
        const aliasesJson = JSON.stringify(aliasesToStore.filter(a => a.name.trim() !== ''));

        await client.query(
          'UPDATE entries SET title = $1, definition = $2, type = $3, aliases = $4, video_link = $5, updated_at = NOW() WHERE id = $6',
          [name, description, type, aliasesJson, videoLink, id]
        );
    
        if (type === 'exicon') {
          await client.query('DELETE FROM entry_tags WHERE entry_id = $1', [id]);
          const tagIds = (entry as ExiconEntry).tags.map(t => t.id);
          if (tagIds.length > 0) {
            const entryTagValues = tagIds.map(tagId => `('${id}', '${tagId}')`).join(',');
            await client.query(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ${entryTagValues}`);
          }
        }
    
        await client.query('COMMIT');
        const updatedEntry = await getEntryByIdFromDatabase(id);
        if (!updatedEntry) throw new Error(`Failed to retrieve updated entry with ID ${id}`);
        return updatedEntry;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating entry in database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };

    export const createEntryInDatabase = async (entry: Omit<AnyEntry, 'id' | 'linkedDescriptionHtml'> & { id?: string }): Promise<AnyEntry> => {
      const client = await getClient();
      try {
        await client.query('BEGIN');
    
        const { name, description, type } = entry;
        const entryId = entry.id || `${type}-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}`;
        const videoLink = (type === 'exicon') ? (entry as ExiconEntry).videoLink || null : null;

        const aliasesToStore = Array.isArray(entry.aliases)
            ? entry.aliases.map(alias => (typeof alias === 'string' ? { name: alias } : alias))
            : [];
        const aliasesJson = JSON.stringify(aliasesToStore.filter(a => a && a.name && a.name.trim() !== ''));

        await client.query(
          `INSERT INTO entries (id, title, definition, type, aliases, video_link)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [entryId, name, description, type, aliasesJson, videoLink]
        );
    
        if (type === 'exicon' && (entry as ExiconEntry).tags) {
          const tagIds = (entry as ExiconEntry).tags.map(t => t.id);
          if (tagIds.length > 0) {
            const entryTagValues = tagIds.map(tagId => `('${entryId}', '${tagId}')`).join(',');
            await client.query(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ${entryTagValues}`);
          }
        }
    
        await client.query('COMMIT');
        const createdEntry = await getEntryByIdFromDatabase(entryId);
        if (!createdEntry) throw new Error(`Failed to retrieve created entry with ID ${entryId}`);
        return createdEntry;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating entry in database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    export const deleteEntryFromDatabase = async (id: string | number): Promise<void> => {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const queryId = String(id);
        await client.query('DELETE FROM entry_tags WHERE entry_id = $1', [queryId]);
        const res = await client.query('DELETE FROM entries WHERE id = $1', [queryId]);
        if (res.rowCount === 0) {
            console.warn(`Entry with ID ${id} not found for deletion.`);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error deleting entry with ID ${id} from database:`, err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };

    export const getAllEntryNamesFromDatabase = async (): Promise<string[]> => {
      const client = await getClient();
      try {
        const res = await client.query('SELECT title FROM entries'); 
        return res.rows.map((row: { title: any; }) => row.title); 
      } catch (err: any) {
        const errorMessage = err.message ? String(err.message).toLowerCase() : "";
        if (errorMessage.includes('relation "entries" does not exist')) {
            const detailedErrorMsg = 'CRITICAL SERVER LOG: The "entries" table was not found when trying to fetch entry names. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' + err.stack;
            console.error(detailedErrorMsg);
            throw new Error('DATABASE SETUP ERROR: The "entries" table is MISSING when fetching names. This is NOT a code bug. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.');
        }
        console.error('Error fetching all entry names from database:', err);
        throw err;
      } finally {
        if (client) client.release();
      }
    };


    // BaseEntry interface for internal use, not exported
    interface BaseEntry {
        id: string;
        name: string;
        description: string;
        aliases: Alias[];
    }
    

    



