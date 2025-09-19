'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getBackUrl } from '@/lib/route-utils';

interface BackButtonProps {
  entryType: 'exicon' | 'lexicon';
  className?: string;
}

export function BackButton({ entryType, className }: BackButtonProps) {
  const [backUrl, setBackUrl] = useState(`/${entryType}`);

  useEffect(() => {
    setBackUrl(getBackUrl(entryType));
  }, [entryType]);

  const displayText = entryType === 'lexicon' ? 'Back to Lexicon' : 'Back to Exicon';

  return (
    <Button asChild variant="ghost" className={className}>
      <Link href={backUrl}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {displayText}
      </Link>
    </Button>
  );
}