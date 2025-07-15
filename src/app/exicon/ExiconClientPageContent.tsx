// app/exicon/ExiconClientPageContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { ExiconDisplay } from '@/components/exicon/ExiconDisplay';
import { Dumbbell, Search } from 'lucide-react';
import type { ExiconEntry, Tag } from '@/lib/types';

export function ExiconClientPageContent() {
  const [exiconDbEntries, setExiconDbEntries] = useState<ExiconEntry[]>([]);
  const [allAvailableTags, setAllAvailableTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');
  const [filteredEntries, setFilteredEntries] = useState<ExiconEntry[]>([]);

  function coerceTagsToValidTagArray(tags: unknown): Tag[] {
    if (Array.isArray(tags)) {
      return tags.map(tag => {
        if (typeof tag === 'string') {
          return { id: tag.toLowerCase().replace(/\s+/g, '-'), name: tag.trim() };
        }
        if (typeof tag === 'object' && tag !== null && typeof tag.name === 'string') {
          return {
            id: String(tag.id ?? `tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`),
            name: tag.name.trim()
          };
        }
        return null;
      }).filter(Boolean) as Tag[];
    }
    return [];
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/exicon');
        const { entries, tags } = await res.json();

        const processed = entries
          .filter((entry: any): entry is ExiconEntry => entry.type === 'exicon')
          .map((entry: { tags: unknown; aliases: any[]; id: any; }) => {
            const processedTags = coerceTagsToValidTagArray(entry.tags);
            const normalizedAliases = Array.isArray(entry.aliases)
              ? entry.aliases.map((alias, i) => {
                  if (typeof alias === 'string') {
                    return { id: `alias-${entry.id}-${i}`, name: alias };
                  }
                  if (alias && typeof alias.name === 'string') {
                    return {
                      id: String(alias.id ?? `alias-${entry.id}-${i}`),
                      name: alias.name,
                    };
                  }
                  return null;
                }).filter((a): a is { id: string; name: string } => a !== null)
              : [];

            return {
              ...entry,
              tags: processedTags,
              aliases: normalizedAliases,
            };
          });

        setExiconDbEntries(processed);
        setAllAvailableTags(tags);
      } catch (err) {
        console.error('❌ Failed to fetch exicon entries:', err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filtered = exiconDbEntries.filter(entry => {
      const matchesSearch = searchTerm === '' || entry.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());
      return matchesSearch && matchesLetter;
    });
    setFilteredEntries(filtered);
  }, [exiconDbEntries, searchTerm, filterLetter]);

  const augmentedEntries = filteredEntries.map(entry => ({
    ...entry,
    linkedDescriptionHtml: entry.description,
  }));

  return (
    <>
      <div className="mb-8 text-center">
        <Dumbbell className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold">F3 Exicon</h1>
        <p className="text-lg text-muted-foreground mt-2">
          The official encyclopedia of F3 exercises.
        </p>
      </div>

      {/* Search and Filter UI remains unchanged */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exercises by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1 justify-center md:justify-end">
          {['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => (
            <button
              key={letter}
              className={`px-3 py-1 text-sm rounded-md ${filterLetter === letter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              onClick={() => {
                setFilterLetter(letter);
                setSearchTerm('');
              }}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <ExiconDisplay initialEntries={augmentedEntries} allTags={allAvailableTags} />
    </>
  );
}