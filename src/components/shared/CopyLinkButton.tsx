'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface CopyLinkButtonProps {
    videoLink: string;
}

export default function CopyLinkButton({ videoLink }: CopyLinkButtonProps) {
    const { toast } = useToast();

    const handleCopyVideoLink = async () => {
        if (videoLink) {
            try {
                await navigator.clipboard.writeText(videoLink);
                toast({ title: "Video Link Copied!", description: "The video link has been copied to your clipboard." });
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = videoLink;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                toast({ title: "Video Link Copied!", description: "The video link has been copied to your clipboard." });
            }
        }
    };

    return (
        <Button onClick={handleCopyVideoLink} variant="outline" size="sm">
            <Copy className="mr-2 h-4 w-4" /> Copy Video Link
        </Button>
    );
}
