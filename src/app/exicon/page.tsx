import { PageContainer } from '@/components/layout/PageContainer';
import { ExiconClientPageContent } from './ExiconClientPageContent';
import { fetchAllEntries } from '@/lib/api';
import type { ExiconEntry, AnyEntry, Tag } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Exicon - F3 Codex',
  description: 'Explore F3 exercises in the Exicon.',
};

async function getExiconEntries() {
  try {
    const allEntries: AnyEntry[] = await fetchAllEntries();



    const exiconEntries: ExiconEntry[] = allEntries.filter(
      (entry): entry is ExiconEntry => entry.type === 'exicon'
    );


    return { exiconEntries, allEntries };
  } catch (error) {
    console.error('❌ Runtime Data Fetching Error: Could not fetch exicon entries:', error);
    throw new Error('Failed to fetch exicon entries at runtime.');
  }
}

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

function createResolvedMentionsData(mentionedEntries: string[], allEntries: AnyEntry[]): Record<string, AnyEntry> {
  const entryMapById = new Map<string, AnyEntry>();
  allEntries.forEach(entry => {
    entryMapById.set(entry.id, entry);
  });

  const resolvedMentions: Record<string, AnyEntry> = {};


  // Resolve mentions using mentionedEntries
  mentionedEntries.forEach(entryId => {
    const entry = entryMapById.get(entryId);
    if (entry) {
      resolvedMentions[entry.name] = entry;
      entry.aliases?.forEach(alias => {
        resolvedMentions[alias.name] = entry;
      });
    }
  });


  return resolvedMentions;
}

export default async function ExiconPage() {
  const { exiconEntries, allEntries } = await getExiconEntries();

  const processedEntries = exiconEntries.map((entry) => {
    const processedTags = coerceTagsToValidTagArray(entry.tags);
    const normalizedAliases = normalizeAliases(entry.aliases, entry.id);
    const mentionedEntries = entry.mentionedEntries || [];


    const resolvedMentionsData = createResolvedMentionsData(mentionedEntries, allEntries);

    return {
      ...entry,
      tags: processedTags,
      aliases: normalizedAliases,
      mentionedEntries,
      resolvedMentionsData,
    };
  });

  const uniqueTags = new Map<string, Tag>();
  processedEntries.forEach(entry => {
    entry.tags?.forEach(tag => {
      if (!uniqueTags.has(tag.id)) {
        uniqueTags.set(tag.id, tag);
      }
    });
  });
  const allAvailableTags: Tag[] = Array.from(uniqueTags.values());

  return (
    <PageContainer>
      <ExiconClientPageContent initialEntries={processedEntries} allTags={allAvailableTags} />
    </PageContainer>
  );
}