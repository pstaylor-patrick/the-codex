export interface Tag {
  id: string; // Tags may still come from various sources, keep as string
  name: string;
}

export interface Alias {
  id: string; // Use string for consistency with Tag ID structure
  name: string;
}

export interface BaseEntry {
  id: string;
  name: string;
  description: string;
  linkedDescriptionHtml?: string;
  aliases?: Alias[]; // ✅ updated from string[] to Alias[]
}

export interface ExiconEntry extends BaseEntry {
  type: 'exicon';
  tags: Tag[];
  videoLink?: string;
}

export interface LexiconEntry extends BaseEntry {
  type: 'lexicon';
}

export type AnyEntry = ExiconEntry | LexiconEntry;

export type FilterLogic = 'AND' | 'OR';


// Base type for UserSubmission to allow for a numeric ID from the database
export interface UserSubmissionBase<T = NewEntrySuggestionData | EditEntrySuggestionData> {
  id: number;
  submissionType: 'new' | 'edit';
  data: T;
  submitterName?: string;
  submitterEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

// Types for User Submissions data payloads
export interface NewEntrySuggestionData {
  entryType: 'exicon' | 'lexicon';
  name: string;
  description: string;
  aliases?: string[]; // ✅ still use string[] for input forms
  tags?: string[];     // tags can be names or IDs
  videoLink?: string;
}

export interface EditEntrySuggestionData {
  entryId: string;
  entryName: string;
  entryType: 'exicon' | 'lexicon';
  changes: {
    description?: string;
    aliases?: string[]; // ✅ input-only
    tags?: string[];
    videoLink?: string;
  };
  comments: string;
}

export type UserSubmission<T = NewEntrySuggestionData | EditEntrySuggestionData> = UserSubmissionBase<T>;

export type NewUserSubmission<T = NewEntrySuggestionData | EditEntrySuggestionData> =
  Omit<UserSubmissionBase<T>, 'id' | 'status' | 'timestamp'>;