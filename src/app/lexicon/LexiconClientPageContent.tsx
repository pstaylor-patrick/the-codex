'use client';

import { useState, useMemo } from 'react';
import type { AnyEntry, LexiconEntry } from '@/lib/types';
import { SearchBar } from '@/components/shared/SearchBar';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { EntryGrid } from '@/components/shared/EntryGrid';

interface LexiconClientPageContentProps {
  initialEntries: AnyEntry[];
}

function exportToCSV(entries: LexiconEntry[], filename: string = 'lexicon-export.csv') {
  if (!entries || entries.length === 0) {
    return;
  }

  const replacer = (_key: string, value: any) => (value === null || value === undefined ? '' : value);

  const header = ['ID', 'Name', 'Description', 'Aliases'];
  const csvRows = [
    header.join(','),
    ...entries.map(entry => [
      JSON.stringify(entry.id, replacer),
      JSON.stringify(entry.name, replacer),
      JSON.stringify(entry.description, replacer),
      JSON.stringify(entry.aliases?.join('; ') || '', replacer),
    ].join(','))
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const LexiconClientPageContent = ({ initialEntries }: LexiconClientPageContentProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.aliases && entry.aliases.some(alias => {
          const aliasName = typeof alias === 'string' ? alias : (alias as { name?: string }).name;
          return typeof aliasName === 'string' && aliasName.toLowerCase().includes(searchTerm.toLowerCase());
        }))
      );
    });
  }, [initialEntries, searchTerm]);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search Lexicon..." />
        <Button
          onClick={() => exportToCSV(filteredEntries.filter((entry): entry is LexiconEntry => entry.type === 'lexicon'))}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <EntryGrid entries={filteredEntries} />
    </div>
  );
};
