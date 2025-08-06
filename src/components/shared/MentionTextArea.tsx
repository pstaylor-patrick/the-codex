'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { CardDescription } from '@/components/ui/card';
import type { EntryWithReferences } from '@/lib/types';

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  searchEntries: (query: string) => Promise<EntryWithReferences[]>;
  placeholder?: string;
  rows?: number;
  onMentionsChange?: (mentions: { id: string; name: string }[]) => void;
}

export function MentionTextArea({ value, onChange, searchEntries, placeholder, rows, onMentionsChange }: MentionTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntryWithReferences[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mentions, setMentions] = useState<{ id: string; name: string; description?: string; type?: string }[]>([]);

  const debounce = useCallback((fn: (...args: any[]) => void, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }, []);

  const debouncedSearch = useCallback(debounce(async (text: string) => {
    setLoading(true);
    try {
      const data = await searchEntries(text);
      setResults(data);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300), [searchEntries]);

  useEffect(() => {
    if (showAutocomplete && query) debouncedSearch(query);
    else setResults([]);
  }, [query, showAutocomplete, debouncedSearch]);


  useEffect(() => {
    setMentions(prevMentions => {
      const stillMentioned = prevMentions.filter(m => value.includes(`@${m.name}`));

      const hasChanged = stillMentioned.length !== prevMentions.length ||
        !stillMentioned.every(m => prevMentions.some(p => p.id === m.id));

      if (hasChanged) {
        onMentionsChange?.(stillMentioned.map(({ id, name }) => ({ id, name })));
      }
      return stillMentioned;
    });
  }, [value, onMentionsChange]);


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursorPos = e.target.selectionStart;
    setCursor(cursorPos);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      if (!textAfterAt.includes(' ') && textAfterAt.length <= 50) {
        setQuery(textAfterAt);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
        setQuery('');
      }
    } else {
      setShowAutocomplete(false);
      setQuery('');
    }
  };

  const handleSelect = (entry: EntryWithReferences) => {
    if (!textareaRef.current) return;

    const text = value;
    const pre = text.slice(0, cursor);
    const post = text.slice(cursor);
    const atIdx = pre.lastIndexOf('@');
    const replaced = pre.slice(0, atIdx) + `@${entry.name} `;
    const updated = replaced + post;
    const newCursor = replaced.length;

    setShowAutocomplete(false);
    setQuery('');
    setResults([]);
    setCursor(newCursor);

    onChange(updated);

    setMentions((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      const next = exists ? prev : [...prev, { ...entry }];

      if (!exists) {
        onMentionsChange?.(next.map(({ id, name }) => ({ id, name })));
      }

      return next;
    });

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const renderFormatted = (text: string) => {
    const parts: React.ReactNode[] = [];


    const mentionOccurrences: {
      startIndex: number;
      endIndex: number;
      mention: { id: string; name: string; description?: string; type?: string };
    }[] = [];


    mentions.forEach((mention) => {
      let searchString = `@${mention.name}`;
      let lastIndex = text.indexOf(searchString, 0);
      while (lastIndex !== -1) {
        mentionOccurrences.push({
          startIndex: lastIndex,
          endIndex: lastIndex + searchString.length,
          mention,
        });
        lastIndex = text.indexOf(searchString, lastIndex + 1);
      }
    });


    mentionOccurrences.sort((a, b) => a.startIndex - b.startIndex);

    let lastIndex = 0;

    mentionOccurrences.forEach(({ startIndex, endIndex, mention }, i) => {
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      parts.push(
        <HoverCard key={`mention-${i}-${mention.id}`}>
          <HoverCardTrigger asChild>
            <span className="text-blue-600 underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 px-1 rounded">
              @{mention.name}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="prose text-sm max-w-xs p-3">
            {mention ? (
              <>
                <p className="font-semibold text-foreground mb-1">{mention.name}</p>
                <CardDescription className="text-muted-foreground">
                  {mention.description || 'No description available.'}
                </CardDescription>
                <a
                  href={`/entries/${mention.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:underline mt-2 block dark:text-blue-300"
                >
                  View Entry Page
                </a>
              </>
            ) : (
              <span className="text-gray-500">Mention not found in current selection.</span>
            )}
          </HoverCardContent>
        </HoverCard>
      );

      lastIndex = endIndex;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowAutocomplete(false);
          }
          if (e.key === 'Enter' && showAutocomplete && results.length > 0) {
            e.preventDefault();
            handleSelect(results[0]);
          }
          if (e.key === 'ArrowDown' && showAutocomplete && results.length > 0) {
            e.preventDefault();
          }
          if (e.key === 'ArrowUp' && showAutocomplete && results.length > 0) {
            e.preventDefault();
          }
        }}
        onBlur={(e) => {

          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget || !relatedTarget.closest('[role="dialog"]')) {
            setTimeout(() => setShowAutocomplete(false), 150);
          }
        }}
        onFocus={() => {

          if (showAutocomplete && query) {

            setShowAutocomplete(true);
          }
        }}
      />

      <Popover open={showAutocomplete}>
        <PopoverTrigger asChild>
          <span style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 z-[9999] max-h-60 overflow-y-auto shadow-md border rounded-md bg-popover text-popover-foreground w-80"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => {

            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {

            e.preventDefault();
            textareaRef.current?.focus();
          }}
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {query ? `No entries found for "${query}"` : 'Start typing to search entries...'}
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {results.map(entry => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  className="group w-full justify-start text-left h-auto py-2 px-3 text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(entry);
                  }}
                  onFocus={(e) => {

                    e.preventDefault();
                  }}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-semibold">{entry.name}</span>
                    {entry.description && (
                      <span className="text-xs text-muted-foreground group-hover:text-accent-foreground whitespace-normal break-words">
                        {entry.description}
                      </span>
                    )}
                    <a
                      href={`/entries/${entry.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 hover:underline mt-1 dark:text-blue-300 group-hover:text-accent-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Entry
                    </a>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="mt-4 p-3 border rounded-md bg-secondary text-secondary-foreground min-h-[50px] overflow-auto">
        <p className="text-sm text-muted-foreground mb-2">Formatted Preview:</p>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {renderFormatted(value)}
        </div>
      </div>
    </div>
  );
}
