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

  const allEntries = await fetchAllEntries();

  const exiconEntries = allEntries.filter(
    (entry): entry is ExiconEntry => entry.type === 'exicon'
  );

  let enrichedEntries: ExiconEntry[] = exiconEntries;
  let allAvailableTags: Tag[] = [];

  try {

    const uniqueMentionedIds = getUniqueMentionedIds(exiconEntries);


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

  } catch (error) {
    console.error("Failed to fetch and enrich Exicon entries on the server:", error);
    enrichedEntries = exiconEntries;
    allAvailableTags = [];
  }

  return (
    <PageContainer>
      <ExiconClientPageContent
        initialEntries={enrichedEntries}
        allTags={allAvailableTags}
      />
    </PageContainer>
  );
}
