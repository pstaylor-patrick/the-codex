'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getBackUrl, isInIframe } from '@/lib/route-utils';

interface BackButtonProps {
  entryType: 'exicon' | 'lexicon';
  className?: string;
}

export function BackButton({ entryType, className }: BackButtonProps) {
  const [backUrl, setBackUrl] = useState(`/${entryType}`);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    const isInFrame = isInIframe();
    setInIframe(isInFrame);
    setBackUrl(getBackUrl(entryType));
  }, [entryType]);

  const displayText = entryType === 'lexicon' ? 'Back to Lexicon' : 'Back to Exicon';

  const handleClick = () => {
    if (inIframe) {
      // Navigate the parent window, not the iframe
      if (window.parent) {
        window.parent.location.href = backUrl;
      } else {
        window.top!.location.href = backUrl;
      }
    }
  };

  return (
    <Button
      asChild={!inIframe}
      variant="ghost"
      className={className}
      onClick={inIframe ? handleClick : undefined}
    >
      {inIframe ? (
        <>
          <ArrowLeft className="mr-2 h-4 w-4" /> {displayText}
        </>
      ) : (
        <Link href={backUrl}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {displayText}
        </Link>
      )}
    </Button>
  );
}