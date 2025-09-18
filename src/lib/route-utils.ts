/**
 * Determines the appropriate base URL for entry links based on current route
 */
export function getEntryBaseUrl(entryType: 'exicon' | 'lexicon'): string {
  // Check if we're on lexicon-2 route
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/lexicon-2')) {
      return entryType === 'lexicon' ? 'lexicon-2' : 'exicon';
    }
  }

  // Default routes
  return entryType;
}

/**
 * Generates the appropriate URL for copying based on current context
 */
export function generateEntryUrl(entryId: string, entryType: 'exicon' | 'lexicon'): string {
  const baseRoute = getEntryBaseUrl(entryType);
  const encodedId = encodeURIComponent(entryId);
  return `https://f3nation.com/${baseRoute}?entryId=${encodedId}`;
}