'use client';

import { useState, useEffect } from 'react';
import { ExiconDisplay } from '@/components/exicon/ExiconDisplay';
import { Dumbbell, Search } from 'lucide-react';
import type { ExiconEntry, Tag, FilterLogic, AnyEntry } from '@/lib/types';

interface ExiconClientPageContentProps {
  initialEntries: (ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[];
  allTags: Tag[];
}

export function ExiconClientPageContent({ initialEntries, allTags }: ExiconClientPageContentProps) {
  const [exiconDbEntries, setExiconDbEntries] = useState<(ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[]>(initialEntries);
  const [allAvailableTags, setAllAvailableTags] = useState<Tag[]>(allTags);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');
  const [filteredEntries, setFilteredEntries] = useState<(ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[]>(initialEntries);

  // New state for tag filtering
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('OR');

  // Handler for tag selection changes
  const handleTagChange = (tagId: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagId)
        ? prevSelectedTags.filter((id) => id !== tagId)
        : [...prevSelectedTags, tagId]
    );
  };

  // Handler for filter logic changes
  const handleFilterLogicChange = (logic: FilterLogic) => {
    setFilterLogic(logic);
  };


  useEffect(() => {
    const filtered = exiconDbEntries.filter(entry => {
      const matchesSearch =
        searchTerm === '' ||
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.aliases && entry.aliases.some(alias => alias.name.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());


      const matchesTags = () => {
        if (selectedTags.length === 0) {
          return true;
        }

        const entryTagIds = entry.tags?.map(tag => tag.id) || [];

        if (filterLogic === 'AND') {
          return selectedTags.every(selectedTagId => entryTagIds.includes(selectedTagId));
        } else {
          return selectedTags.some(selectedTagId => entryTagIds.includes(selectedTagId));
        }
      };

      return matchesSearch && matchesLetter && matchesTags();
    });
    

    setFilteredEntries(filtered);
  }, [exiconDbEntries, searchTerm, filterLetter, selectedTags, filterLogic]);




  return (
    <>
      <div className="mb-8 text-center">
        <Dumbbell className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold">F3 Exicon</h1>
        <p className="text-lg text-muted-foreground mt-2">
          The official encyclopedia of F3 exercises.
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exercises by name or alias..."
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


      <ExiconDisplay initialEntries={filteredEntries} allTags={allAvailableTags} />
    </>
  );
}