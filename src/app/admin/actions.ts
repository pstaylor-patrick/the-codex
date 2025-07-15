// src/app/admin/actions.ts
'use server';

import {
  fetchAllEntries as apiFetchAllEntries,
  createEntryInDatabase as apiCreateEntryInDatabase,
  updateEntryInDatabase as apiUpdateEntryInDatabase,
  deleteEntryFromDatabase as apiDeleteEntryFromDatabase,
  fetchTagsFromDatabase as apiFetchTagsFromDatabase,
  createTagInDatabase as apiCreateTagInDatabase,
  updateTagInDatabase as apiUpdateTagInDatabase,
  deleteTagFromDatabase as apiDeleteTagFromDatabase,
  fetchPendingSubmissionsFromDatabase as apiFetchPendingSubmissionsFromDatabase,
  updateSubmissionStatusInDatabase as apiUpdateSubmissionStatusInDatabase,
  applyApprovedSubmissionToDatabase as apiApplyApprovedSubmissionToDatabase,
  getEntryByIdFromDatabase as apiGetEntryByIdFromDatabase,
} from '@/lib/api';
import type { AnyEntry, Tag, UserSubmissionBase } from '@/lib/types';

export async function fetchAllEntries(): Promise<AnyEntry[]> {
  return apiFetchAllEntries();
}

export async function createEntryInDatabase(entry: Omit<AnyEntry, 'id'>): Promise<AnyEntry> {
  return apiCreateEntryInDatabase(entry);
}

export async function updateEntryInDatabase(entry: AnyEntry): Promise<AnyEntry> {
  return apiUpdateEntryInDatabase(entry);
}

export async function deleteEntryFromDatabase(id: string | number): Promise<void> {
  return apiDeleteEntryFromDatabase(id);
}

export async function fetchTagsFromDatabase(): Promise<Tag[]> {
  return apiFetchTagsFromDatabase();
}

export async function createTagInDatabase(name: string): Promise<Tag> {
  return apiCreateTagInDatabase(name);
}

export async function updateTagInDatabase(id: string, name: string): Promise<Tag> {
  return apiUpdateTagInDatabase(id, name);
}

export async function deleteTagFromDatabase(id: string): Promise<void> {
  return apiDeleteTagFromDatabase(id);
}

export async function fetchPendingSubmissionsFromDatabase(): Promise<UserSubmissionBase<any>[]> {
  return apiFetchPendingSubmissionsFromDatabase();
}

export async function updateSubmissionStatusInDatabase(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  return apiUpdateSubmissionStatusInDatabase(id, status);
}

export async function applyApprovedSubmissionToDatabase(submission: UserSubmissionBase<any>): Promise<void> {
  return apiApplyApprovedSubmissionToDatabase(submission);
}

export async function fetchEntryById(id: string | number): Promise<AnyEntry | null> {
  return apiGetEntryByIdFromDatabase(id);
}
