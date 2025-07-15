// src/components/shared/EntryCard.tsx
'use client';

import type { AnyEntry, ExiconEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Pencil, Copy, ExternalLink, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SuggestionEditForm } from '@/components/submission/SuggestionEditForm';
import { useToast } from '@/hooks/use-toast';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EntryCardProps {
  entry: AnyEntry;
}

const MAX_DESC_LENGTH_PREVIEW = 150;

export function EntryCard({ entry }: EntryCardProps) {
  const { toast } = useToast();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSuggestEditFormOpen, setIsSuggestEditFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(entry.linkedDescriptionHtml || entry.description);
  const [showGradient, setShowGradient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const baseDescription = entry.linkedDescriptionHtml || entry.description;
      const textContent = baseDescription.replace(/<[^>]*>/g, '');
      const needsTruncation = textContent.length > MAX_DESC_LENGTH_PREVIEW;

      if (needsTruncation) {
        setPreviewHtml(`${textContent.substring(0, MAX_DESC_LENGTH_PREVIEW)}...`);
        setShowGradient(true);
      } else {
        setPreviewHtml(baseDescription);
        setShowGradient(false);
      }
    }
  }, [isClient, entry.description, entry.linkedDescriptionHtml, entry.name]);

  const fullDescriptionHtml = entry.linkedDescriptionHtml || entry.description;

  const handleSuggestionSubmit = (suggestionData: any) => {
    toast({
      title: "Suggestion Submitted",
      description: `Your suggestions for "${entry.name}" have been recorded. Thank you!`,
    });
    setIsSuggestEditFormOpen(false);
  };

  const handleCopyVideoLink = async () => {
    if (entry.type === 'exicon' && (entry as ExiconEntry).videoLink) {
      try {
        await navigator.clipboard.writeText((entry as ExiconEntry).videoLink!);
        toast({ title: "Video Link Copied!", description: "The video link has been copied to your clipboard." });
      } catch {
        toast({ title: "Failed to Copy", description: "Could not copy the video link.", variant: "destructive" });
      }
    }
  };

  const handleCopyEntryContent = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const content = `Name: ${entry.name}\n\nDescription: ${entry.description}`;
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Entry Content Copied!", description: "Name and description copied to clipboard." });
    } catch {
      toast({ title: "Failed to Copy Content", description: "Could not copy entry content.", variant: "destructive" });
    }
  };

  const videoLink = entry.type === 'exicon' ? (entry as ExiconEntry).videoLink : undefined;
  const embedUrl = videoLink ? getYouTubeEmbedUrl(videoLink) : null;

  console.log("Entry Aliases:", entry.aliases); // Added console log here

  return (
    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
      <DialogTrigger asChild>
        <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full cursor-pointer">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-grow">
                <CardTitle className="text-xl font-semibold text-primary">{entry.name}</CardTitle>
                {entry.aliases && entry.aliases.length > 0 ? (
                  <p className="text-sm text-muted-foreground italic">
  Also known as:{' '}
  {entry.aliases
    .map(alias => (typeof alias === 'string' ? alias : alias.name))
    .join(', ')}
</p>
) :
null
}

              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyEntryContent}
                      className="ml-auto flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-accent"
                      aria-label="Copy entry content"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy Name & Description</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent className="flex-grow space-y-3">
            <div className="prose prose-sm max-w-none text-foreground break-words relative max-h-[4.5rem] overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              {showGradient && (
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-card via-card/80 to-transparent" />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-2 pt-4 border-t mt-auto">
  {entry.type === 'exicon' && Array.isArray((entry as ExiconEntry).tags) && (entry as ExiconEntry).tags.length > 0 ? (
    (entry as ExiconEntry).tags.map(tag => (
      <Badge key={tag.id} variant="secondary" className="font-normal">
        {tag.name}
      </Badge>
    ))
  ) : (
 null
  )}
</CardFooter>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[725px] max-h-[90vh] flex flex-col" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl text-primary">{entry.name}</DialogTitle>
          {entry.aliases && entry.aliases.length > 0 ? (
  <CardDescription className="text-sm italic mt-1">
    Also known as:{' '}
    {entry.aliases.map(alias =>
      typeof alias === 'string' ? alias : alias.name
    ).join(', ')}
  </CardDescription>
) : null}
        </DialogHeader>

        <div className="flex-grow overflow-y-auto space-y-4 pr-3 py-2">
          <div className="prose prose-base max-w-none text-foreground break-words">
            <div dangerouslySetInnerHTML={{ __html: fullDescriptionHtml }} />
          </div>

          {entry.type === 'exicon' && (
            <div className="space-y-3">
              {embedUrl ? (
                <>
                  <div className="aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src={embedUrl}
                      title={`YouTube video player for ${entry.name}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="rounded-md shadow-md"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopyVideoLink} variant="outline" size="sm">
                      <Copy className="mr-2 h-4 w-4" /> Copy Video Link
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={videoLink || '#'} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Original Video
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No video available for this exercise.</p>
              )}
            </div>
          )}

{entry.type === 'exicon' && (
  <div className="pt-2">
    <h4 className="text-md font-semibold mb-2">Tags:</h4>
    {(entry as ExiconEntry).tags.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {(entry as ExiconEntry).tags.map(tag => (
          <Badge key={tag.id} variant="secondary" className="font-normal">
            {tag.name}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground italic">No tags available for this exercise.</p>
    )}
  </div>
)}
        </div>

        <div className="flex-shrink-0 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2">
          <Dialog open={isSuggestEditFormOpen} onOpenChange={setIsSuggestEditFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Pencil className="mr-2 h-4 w-4" /> Suggest Edits
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Suggest Edits for: {entry.name}</DialogTitle>
              </DialogHeader>
              <SuggestionEditForm
                entryToSuggestEditFor={entry}
                onFormSubmit={handleSuggestionSubmit}
                onClose={() => setIsSuggestEditFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <DialogClose asChild>
            <Button variant="ghost" className="w-full sm:w-auto">
              <XCircle className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
