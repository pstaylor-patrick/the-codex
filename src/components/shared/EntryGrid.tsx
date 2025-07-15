import type { AnyEntry } from '@/lib/types';
import { EntryCard } from '@/components/shared/EntryCard';

interface EntryGridProps {
  entries: AnyEntry[];
  label?: string; // Optional: helpful for logging different entry sources
}

export function EntryGrid({ entries, label }: EntryGridProps) {
  if (!entries || entries.length === 0) {
    if (label) {
      console.warn(`[EntryGrid] No entries found for: ${label}`);
    }
    return (
      <p className="text-center text-muted-foreground py-10">
        No entries match your criteria.
      </p>
    );
  }

  if (label) {
    console.log(`[EntryGrid] Rendering ${entries.length} entries for: ${label}`);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map(entry => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}