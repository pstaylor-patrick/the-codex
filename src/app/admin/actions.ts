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
import type { AnyEntry, EntryWithReferences, ExiconEntry, NewEntrySuggestionData, Tag, UserSubmissionBase, EditEntrySuggestionData } from '@/lib/types';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Sends status update email to submitter
 */
async function sendStatusUpdateNotification(
  submission: UserSubmissionBase<any>,
  status: 'approved' | 'rejected'
) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured - skipping status update email');
    return;
  }

  if (!process.env.FROM_EMAIL) {
    console.warn('FROM_EMAIL not configured - skipping status update email');
    return;
  }

  if (!submission.submitterEmail) {
    console.log('No submitter email provided - skipping status update email');
    return;
  }

  try {
    const isEdit = submission.submissionType === 'edit';
    const entryName = isEdit
      ? (submission.data as EditEntrySuggestionData).entryName
      : (submission.data as NewEntrySuggestionData).name;

    const msg = {
      to: submission.submitterEmail,
      from: process.env.FROM_EMAIL!,
      subject: `Submission ${status === 'approved' ? 'Approved' : 'Update'}: ${entryName}`,
      html: status === 'approved'
        ? `
          <h2>Great news!</h2>
          <p>Hi ${submission.submitterName || 'there'},</p>
          <p>Your ${isEdit ? 'edit suggestion' : 'entry suggestion'} for "<strong>${entryName}</strong>" has been <strong>approved</strong> and is now live!</p>
          <p>Thank you for contributing to the F3 community.</p>
          <br>
          <p>Keep the suggestions coming!</p>
        `
        : `
          <h2>Submission Update</h2>
          <p>Hi ${submission.submitterName || 'there'},</p>
          <p>Thank you for your ${isEdit ? 'edit suggestion' : 'entry suggestion'} for "<strong>${entryName}</strong>".</p>
          <p>After careful review, we've decided not to implement this suggestion at this time.</p>
          <p>We appreciate your contribution and encourage you to keep sharing ideas with the F3 community.</p>
        `
    };

    console.log(`Sending ${status} notification email to: ${submission.submitterEmail}`);
    await sgMail.send(msg);
    console.log(`${status} notification email sent successfully to: ${submission.submitterEmail}`);
  } catch (error) {
    console.error('Error sending status update email:', error);
    console.error('Status update email error details:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      hasFromEmail: !!process.env.FROM_EMAIL,
      submitterEmail: submission.submitterEmail,
      submitterName: submission.submitterName,
      status,
      entryName: submission.submissionType === 'edit'
        ? (submission.data as EditEntrySuggestionData).entryName
        : (submission.data as NewEntrySuggestionData).name
    });
  }
}

export async function fetchAllEntries(): Promise<AnyEntry[]> {
  return apiFetchAllEntries();
}

export async function createEntryInDatabase(
  entry: Omit<AnyEntry, 'id' | 'linkedDescriptionHtml'> & { id?: string }
): Promise<AnyEntry> {
  const aliasesAsStrings: string[] = (entry.aliases || []).map(alias =>
    typeof alias === 'string' ? alias : alias.name
  );

  let tagsAsStrings: string[];
  if (entry.type === 'exicon') {
    tagsAsStrings = ((entry as ExiconEntry).tags || []).map(tag => tag.name);
  } else {
    tagsAsStrings = [];
  }

  const mentionedEntries: string[] = entry.mentionedEntries || [];
  const newEntryData: NewEntrySuggestionData & { id?: string } = {
    name: entry.name,
    description: entry.description,
    aliases: aliasesAsStrings,
    entryType: entry.type,
    tags: tagsAsStrings,
    videoLink: (entry as ExiconEntry).videoLink,
    mentionedEntries: mentionedEntries,
    id: entry.id,
  };

  return apiCreateEntryInDatabase(newEntryData);
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

export async function updateSubmissionStatusInDatabase(
  id: number,
  status: 'pending' | 'approved' | 'rejected',
  submission?: UserSubmissionBase<any>
): Promise<void> {
  await apiUpdateSubmissionStatusInDatabase(id, status);

  // Send email notification if submission data is provided and status is approved/rejected
  if (submission && (status === 'approved' || status === 'rejected')) {
    console.log(`Attempting to send ${status} email for submission:`, {
      submissionId: id,
      submitterEmail: submission.submitterEmail,
      submitterName: submission.submitterName,
      submissionType: submission.submissionType
    });
    await sendStatusUpdateNotification(submission, status);
  } else {
    console.log(`Skipping email notification - submission: ${!!submission}, status: ${status}`);
  }
}

export async function applyApprovedSubmissionToDatabase(submission: UserSubmissionBase<any>): Promise<EntryWithReferences> {
  const result = await apiApplyApprovedSubmissionToDatabase(submission);

  // Note: Email notification is handled by updateSubmissionStatusInDatabase when called after this function
  return result;
}

export async function fetchEntryById(id: string | number): Promise<AnyEntry | null> {
  return apiGetEntryByIdFromDatabase(String(id));
}
