// app/lexicon/LexiconClientPageContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search } from 'lucide-react';
import type { LexiconEntry } from '@/lib/types';
import { LexiconDisplay } from '@/components/lexicon/LexiconDisplay';

export function LexiconClientPageContent() {
  const [lexiconDbEntries, setLexiconDbEntries] = useState<LexiconEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');
  const [filteredEntries, setFilteredEntries] = useState<LexiconEntry[]>([]);

  // 👇 Moved the fetch here
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/lexicon');
      const data = await res.json();
      setLexiconDbEntries(
        data
          .filter((entry: any): entry is LexiconEntry => entry.type === 'lexicon')
          .map((entry: { description: any; }) => ({
            ...entry,
            linkedDescriptionHtml: entry.description,
          }))
      );
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = lexiconDbEntries.filter(entry => {
      const matchesSearch = searchTerm === '' || entry.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());
      return matchesSearch && matchesLetter;
    });
    setFilteredEntries(filtered);
  }, [lexiconDbEntries, searchTerm, filterLetter]);

  return (
    <>
      {/* ...same rendering as before */}
      <LexiconDisplay initialEntries={filteredEntries} />
    </>
  );
}