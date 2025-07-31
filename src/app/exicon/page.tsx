import { PageContainer } from '@/components/layout/PageContainer';
import { ExiconClientPageContent } from './ExiconClientPageContent';
import { fetchAllEntries } from '@/lib/api';
import type { ExiconEntry, AnyEntry, Tag } from '@/lib/types';

// Force dynamic rendering - this prevents static generation at build time
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Exicon - F3 Codex',
  description: 'Explore F3 exercises in the Exicon.',
};

async function getExiconEntries() {
  try {
    console.log('Fetching all entries for exicon at runtime using src/lib/api.ts...');
    const allEntries: AnyEntry[] = await fetchAllEntries();
    console.log('All Entries with MentionedEntries:', allEntries
      .filter(entry => entry.mentionedEntries?.length)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        mentionedEntries: entry.mentionedEntries
      })));
    console.log('Test-2 Entries:', allEntries
      .filter(entry => entry.name === 'Test-2')
      .map(entry => ({
        id: entry.id,
        description: entry.description,
        mentionedEntries: entry.mentionedEntries
      })));

    const exiconEntries: ExiconEntry[] = allEntries.filter(
      (entry): entry is ExiconEntry => entry.type === 'exicon'
    );
    console.log('Exicon Entries with MentionedEntries:', exiconEntries
      .filter(entry => entry.mentionedEntries?.length)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        mentionedEntries: entry.mentionedEntries
      })));

    console.log(`Successfully fetched and filtered ${exiconEntries.length} exicon entries at runtime.`);
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

  // Log for Test-2
  console.log('Test-2 Mentioned Entries:', mentionedEntries);
  console.log('Test-2 Entry Map By ID:', mentionedEntries.map(id => ({
    id,
    entry: entryMapById.get(id) ? { id: entryMapById.get(id)!.id, name: entryMapById.get(id)!.name } : null
  })));

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

  // Log resolved mentions for Test-2
  if (mentionedEntries.length > 0) {
    console.log('Test-2 Resolved Mentions:', JSON.stringify(resolvedMentions, (key, value) => {
      if (value && typeof value === 'object' && 'id' in value && 'name' in value) {
        return { id: value.id, name: value.name, type: value.type };
      }
      return value;
    }, 2));
  } else {
    console.log('Test-2 Resolved Mentions: None (empty mentionedEntries)');
  }

  return resolvedMentions;
}

export default async function ExiconPage() {
  const { exiconEntries, allEntries } = await getExiconEntries();

  const processedEntries = exiconEntries.map((entry) => {
    const processedTags = coerceTagsToValidTagArray(entry.tags);
    const normalizedAliases = normalizeAliases(entry.aliases, entry.id);
    const mentionedEntries = entry.mentionedEntries || [];

    // Log for Test-2
    if (entry.name === 'Test-2' && entry.description === '@Black Jack is in this @Abyss Merkin ') {
      console.log(`Test-2 Entry Data:`, JSON.stringify({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        mentionedEntries
      }, null, 2));
    }

    const resolvedMentionsData = createResolvedMentionsData(mentionedEntries, allEntries);

    return {
      ...entry,
      tags: processedTags,
      aliases: normalizedAliases,
      mentionedEntries,
      resolvedMentionsData,
    };
  });

  // Collect all unique tags from processedEntries
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