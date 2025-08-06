// src/app/submit/actions.ts
'use server';

import { createSubmissionInDatabase, fetchTagsFromDatabase as apiFetchTagsFromDatabase } from '@/lib/api';
import type { NewUserSubmission, NewEntrySuggestionData, EditEntrySuggestionData, Tag, EntryWithReferences } from '@/lib/types';
import { getClient } from '@/lib/db';
import { transformDbRowToEntry } from '@/lib/api';

/**
 * Searches for entries by name or alias for autocomplete suggestions.
 * @param query The search string.
 * @returns A promise that resolves to an array of matching entries with references.
 */
export async function searchEntriesByName(query: string): Promise<EntryWithReferences[]> {
  const client = await getClient();
  try {
    if (!query || query.trim() === '') {
      return [];
    }
    const searchQuery = `%${query.trim().toLowerCase()}%`;
    const res = await client.query(
      `SELECT
          e.id,
          e.title,
          e.definition,
          e.type,
          e.aliases,
          e.video_link,
          e.mentioned_entries,
          ARRAY_AGG(DISTINCT t.id || '::' || t.name) FILTER (WHERE t.id IS NOT NULL) AS tags_array
       FROM
          entries e
       LEFT JOIN
          entry_tags et ON e.id = et.entry_id
       LEFT JOIN
          tags t ON et.tag_id = t.id
       WHERE
          LOWER(e.title) LIKE $1 OR LOWER(e.aliases::text) LIKE $1
       GROUP BY
          e.id, e.title, e.definition, e.type, e.aliases, e.video_link, e.mentioned_entries
       ORDER BY
          e.title
       LIMIT 10`,
      [searchQuery]
    );

    return res.rows.map(row => transformDbRowToEntry(row)) as EntryWithReferences[];

  } catch (error) {
    console.error("Failed to search entries by name:", error);
    throw new Error("Failed to search entries.");
  } finally {
    client.release();
  }
}


/**
 * Submits a new entry suggestion to the database.
 * @param submission The new user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitNewEntrySuggestion(submission: NewUserSubmission<NewEntrySuggestionData>): Promise<void> {
  await createSubmissionInDatabase(submission);
}

/**
 * Submits an edit suggestion for an existing entry to the database.
 * @param submission The edit user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitEditEntrySuggestion(submission: NewUserSubmission<EditEntrySuggestionData>): Promise<void> {
  await createSubmissionInDatabase(submission);
}

/**
 * Fetches all available tags from the database.
 * @returns A promise that resolves to an array of Tag objects.
 */
export async function fetchAllTags(): Promise<Tag[]> {
  return apiFetchTagsFromDatabase();
}
