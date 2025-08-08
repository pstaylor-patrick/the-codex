import { PageContainer } from '@/components/layout/PageContainer';
import { ExiconClientPageContent } from './ExiconClientPageContent';
import { fetchAllEntries, getEntryByIdFromDatabase } from '@/lib/api';
import type { ExiconEntry, AnyEntry, Tag } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Exicon - F3 Codex',
  description: 'Explore F3 exercises in the Exicon.',
};

const getUniqueMentionedIds = (entries: AnyEntry[]): string[] => {
  const allMentionedIds = entries.flatMap(entry => entry.mentionedEntries || []);
  return Array.from(new Set(allMentionedIds));
};

function coerceTagsToValidTagArray(tags: unknown): Tag[] {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => {
        if (typeof tag === 'string') {
          return { id: tag.toLowerCase().replace(/\s+/g, '-'), name: tag.trim() };
        }
        if (typeof tag === 'object' && tag !== null && typeof tag.name === 'string') {
          return {
            id: String(tag.id ?? `tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`),
            name: tag.name.trim(),
          };
        }
        return null;
      })
      .filter((tag): tag is Tag => tag !== null);
  }
  return [];
}

function normalizeAliases(aliases: unknown, entryId: string): { id: string; name: string }[] {
  return Array.isArray(aliases)
    ? aliases
      .map((alias, i) => {
        if (typeof alias === 'string') {
          return { id: `alias-${entryId}-${i}`, name: alias };
        }
        if (alias && typeof alias.name === 'string') {
          return {
            id: alias.id ?? `alias-${entryId}-${i}`,
            name: alias.name,
          };
        }
        return null;
      })
      .filter((a): a is { id: string; name: string } => a !== null)
    : [];
}

export default async function ExiconPage() {
  // Add detailed error logging
  console.log('🔍 ExiconPage: Starting render');
  console.log('🔍 DATABASE_URL available:', !!process.env.DATABASE_URL);
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

  let allEntries: AnyEntry[] = [];
  let enrichedEntries: ExiconEntry[] = [];
  let allAvailableTags: Tag[] = [];
  let errorMessage = '';

  try {
    console.log('🔍 ExiconPage: Fetching all entries...');
    allEntries = await fetchAllEntries();
    console.log('🔍 ExiconPage: Fetched', allEntries.length, 'entries');

    const exiconEntries = allEntries.filter(
      (entry): entry is ExiconEntry => entry.type === 'exicon'
    );
    console.log('🔍 ExiconPage: Found', exiconEntries.length, 'exicon entries');

    try {
      const uniqueMentionedIds = getUniqueMentionedIds(exiconEntries);
      console.log('🔍 ExiconPage: Found', uniqueMentionedIds.length, 'unique mentions');

      const mentionPromises = uniqueMentionedIds.map(id => getEntryByIdFromDatabase(id));
      const mentionedEntryResults = await Promise.all(mentionPromises);

      const resolvedMentionsData: Record<string, AnyEntry> = {};
      mentionedEntryResults.forEach(entry => {
        if (entry) {
          resolvedMentionsData[entry.id] = entry;
        }
      });

      enrichedEntries = exiconEntries.map((entry) => {
        const processedTags = coerceTagsToValidTagArray(entry.tags);
        const normalizedAliases = normalizeAliases(entry.aliases, entry.id);

        return {
          ...entry,
          tags: processedTags,
          aliases: normalizedAliases,
          resolvedMentionsData,
        };
      });

      const uniqueTags = new Map<string, Tag>();
      enrichedEntries.forEach(entry => {
        entry.tags?.forEach(tag => {
          if (!uniqueTags.has(tag.id)) {
            uniqueTags.set(tag.id, tag);
          }
        });
      });
      allAvailableTags = Array.from(uniqueTags.values());

      console.log('🔍 ExiconPage: Successfully enriched entries');

    } catch (enrichmentError) {
      console.error("❌ ExiconPage: Failed to enrich entries:", enrichmentError);
      // Fallback to basic entries without enrichment
      enrichedEntries = exiconEntries.map(entry => ({
        ...entry,
        tags: coerceTagsToValidTagArray(entry.tags),
        aliases: normalizeAliases(entry.aliases, entry.id),
      }));
      allAvailableTags = [];
      errorMessage = 'Some data enrichment failed, but basic entries are available.';
    }

  } catch (fetchError) {
    console.error("❌ ExiconPage: Failed to fetch entries:", fetchError);
    errorMessage = `Failed to load entries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;


    // Return minimal fallback
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">F3 Exicon</h1>
          <p className="text-red-500 mb-4">Error loading data: {errorMessage}</p>
          <p className="text-muted-foreground">
            DATABASE_URL available: {process.env.DATABASE_URL ? 'Yes' : 'No'}
          </p>
        </div>
      </PageContainer>
    );
  }

  console.log('🔍 ExiconPage: Rendering with', enrichedEntries.length, 'entries');

  return (
    <PageContainer>
      {errorMessage && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Warning</p>
          <p>{errorMessage}</p>
        </div>
      )}
      <ExiconClientPageContent
        initialEntries={enrichedEntries}
        allTags={allAvailableTags}
      />
    </PageContainer>
  );
}
