// src/lib/utils.ts - Modify getYouTubeEmbedUrl

import type { AnyEntry, EntryWithReferences } from './types';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Formats a description string, identifies mentions (@Entry Name),
 * and generates HTML with markup for hover effects.
 *
 * @param description The description string.
 * @param allEntries A list of all available entries to resolve mentions against.
 * @returns A promise that resolves to the HTML string with formatted mentions.
 */
export async function formatDescriptionWithMentionsHTML(
  description: string,
  allEntries: AnyEntry[] // Use AnyEntry as we only need name and ID for linking
): Promise<string> {
  if (!description) {
    return '';
  }

  const mentionRegex = /@([a-zA-Z0-9s_.-]+)(?=[s,.!?;:]|$)/g;
  let lastIndex = 0;
  let html = '';
  let match;

  const entryMap = new Map<string, AnyEntry>();
  // Create a map for quick lookup, case-insensitive name
  for (const entry of allEntries) {
      entryMap.set(entry.name.toLowerCase(), entry);
       // Also add aliases to the map
      if (entry.aliases) {
         for (const alias of entry.aliases) {
            const aliasName = typeof alias === 'string' ? alias : alias.name;
            if (aliasName) {
                 entryMap.set(aliasName.toLowerCase(), entry);
            }
         }
      }
  }


  while ((match = mentionRegex.exec(description)) !== null) {
    const before = description.substring(lastIndex, match.index);
    html += before;

    const mentionName = match[1].trim();
    const matchedEntry = entryMap.get(mentionName.toLowerCase());

    if (matchedEntry) {
      // Generate HTML for a resolved mention with data attributes for hover
      // Using data attributes as a simple way to pass info for a client-side listener
      html += `<span
                 class="entry-mention text-blue-700 underline hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900 cursor-pointer"
                 data-entry-id="${matchedEntry.id}"
                 data-entry-name="${matchedEntry.name}"
                 data-entry-description="${matchedEntry.description.replace(/"/g, '&quot;')}" // Escape quotes for HTML attribute
                 data-entry-type="${matchedEntry.type}"
               >
                 ${matchedEntry.name}
               </span>`;
    } else {
      // Keep the @ sign and potentially style unresolved mentions
      html += `<span class="entry-mention text-yellow-700 dark:text-yellow-300 cursor-help" title="Could not find entry for &quot;${mentionName}&quot;">
                 @${mentionName}
               </span>`;
    }

    lastIndex = mentionRegex.lastIndex;
  }

  html += description.substring(lastIndex);

  return html;
}

// Use RegExp object for youtubeRegex
export const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  const youtubeRegex = new RegExp('^(?:https?://)?(?:www\.)?(?:youtube\.com|youtu\.be)/(?:watch\?v=|embed\/|v\/)([a-zA-Z0-9_-]+)');
  const match = url.match(youtubeRegex);

  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return null;
};
