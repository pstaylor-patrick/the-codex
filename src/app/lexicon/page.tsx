// app/lexicon/page.tsx
export const dynamic = 'force-dynamic';
import { PageContainer } from '@/components/layout/PageContainer';
import { LexiconClientPageContent } from './LexiconClientPageContent';
import { fetchAllEntries, getEntryByIdFromDatabase, fetchTagsFromDatabase } from '@/lib/api';
import type { AnyEntry, LexiconEntry, Tag } from '@/lib/types';



export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParamsResolved = await searchParams;

  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));

    try {
      const entry = await getEntryByIdFromDatabase(entryId);

      if (entry && entry.type === 'lexicon') {
        const title = `${entry.name} - F3 Lexicon`;
        const description = entry.description || `Learn about ${entry.name} in the F3 Lexicon.`;
        const url = `https://f3nation.com/lexicon?entryId=${entryId}`;

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            url,
            siteName: 'F3 Nation Codex',
            type: 'article',
            images: [
              {
                url: '/og-lexicon.png',
                width: 1200,
                height: 630,
                alt: `${entry.name} - F3 Lexicon Term`,
              },
            ],
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/og-lexicon.png'],
          },
        };
      }
    } catch (error) {
      console.error('Failed to generate metadata for entry:', error);
    }
  }

  return {
    title: 'F3 Lexicon - F3 Codex',
    description: 'Explore F3 terminology in the Lexicon.',
  };
}

const getUniqueMentionedIds = (entries: AnyEntry[]): string[] => {
  const allMentionedIds = entries.flatMap(entry => entry.mentionedEntries || []);
  return Array.from(new Set(allMentionedIds));
};


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

export default async function LexiconPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParamsResolved = await searchParams;

  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));

    // Check if the entry exists and get its type
    try {
      const entry = await getEntryByIdFromDatabase(entryId);
      const { redirect } = await import('next/navigation');

      if (entry) {
        // Redirect to the correct section based on entry type
        if (entry.type === 'exicon') {
          redirect(`/exicon/${encodeURIComponent(entryId)}`);
        } else if (entry.type === 'lexicon') {
          redirect(`/lexicon/${encodeURIComponent(entryId)}`);
        }
      } else {
        // Entry not found, just redirect to the current section
        redirect(`/lexicon/${encodeURIComponent(entryId)}`);
      }
    } catch (error) {
      // If there's an error fetching, fallback to current section
      const { redirect } = await import('next/navigation');
      redirect(`/lexicon/${encodeURIComponent(entryId)}`);
    }
  }
  let allEntries: AnyEntry[] = [];
  let enrichedEntries: LexiconEntry[] = [];
  let allAvailableTags: Tag[] = [];
  let errorMessage = '';

  try {
    allEntries = await fetchAllEntries();
    allAvailableTags = await fetchTagsFromDatabase();
    const lexiconEntries = allEntries.filter(
      (entry): entry is LexiconEntry => entry.type === 'lexicon'
    );

    try {
      const uniqueMentionedIds = getUniqueMentionedIds(lexiconEntries);

      const mentionPromises = uniqueMentionedIds.map(id => getEntryByIdFromDatabase(id));
      const mentionedEntryResults = await Promise.all(mentionPromises);

      const resolvedMentionsData: Record<string, AnyEntry> = {};
      mentionedEntryResults.forEach(entry => {
        if (entry) {
          resolvedMentionsData[entry.id] = entry;
        }
      });

      enrichedEntries = lexiconEntries.map((entry) => {
        const normalizedAliases = normalizeAliases(entry.aliases, entry.id);

        return {
          ...entry,
          aliases: normalizedAliases,
          resolvedMentionsData,
        };
      });

    } catch (enrichmentError) {
      console.error("❌ LexiconPage: Failed to enrich entries:", enrichmentError);
      enrichedEntries = lexiconEntries.map(entry => ({
        ...entry,
        aliases: normalizeAliases(entry.aliases, entry.id),
      }));
      errorMessage = 'Some data enrichment failed, but basic entries are available.';
    }

  } catch (fetchError) {
    console.error("❌ LexiconPage: Failed to fetch entries:", fetchError);
    errorMessage = `Failed to load entries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;

    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">F3 Lexicon</h1>
          <p className="text-red-500 mb-4">Error loading data: {errorMessage}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {errorMessage && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Warning</p>
          <p>{errorMessage}</p>
        </div>
      )}
      <LexiconClientPageContent
        initialEntries={enrichedEntries}

      />
    </PageContainer>
  );
}
