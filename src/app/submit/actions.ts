// src/app/submit/actions.ts
'use server';
import { createSubmissionInDatabase, fetchTagsFromDatabase as apiFetchTagsFromDatabase } from '@/lib/api';
import type { NewUserSubmission, NewEntrySuggestionData, EditEntrySuggestionData, Tag } from '@/lib/types';

export async function submitNewEntrySuggestion(data: Omit<NewEntrySuggestionData, 'entryType'> & {type: 'exicon' | 'lexicon', submitterName?: string, submitterEmail?: string }): Promise<void> {
  const submissionData: NewUserSubmission<NewEntrySuggestionData> = {
    submissionType: 'new',
    data: {
      entryType: data.type,
      name: data.name,
      description: data.description,
      aliases: data.aliases,
      tags: data.type === 'exicon' ? data.tags : undefined,
      videoLink: data.type === 'exicon' ? data.videoLink : undefined,
    },
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
  };
  await createSubmissionInDatabase(submissionData);
}

export async function submitEditEntrySuggestion(
  data: EditEntrySuggestionData & { submitterName?: string, submitterEmail?: string }
): Promise<void> {
  const submissionData: NewUserSubmission<EditEntrySuggestionData> = {
    submissionType: 'edit',
    data: {
      entryId: data.entryId,
      entryName: data.entryName,
      entryType: data.entryType,
      changes: data.changes,
      comments: data.comments,
    },
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
  };
  await createSubmissionInDatabase(submissionData);
}

export async function fetchAllTags(): Promise<Tag[]> {
  return apiFetchTagsFromDatabase();
}
