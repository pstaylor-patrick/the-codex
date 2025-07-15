// app/lexicon/page.tsx

import { PageContainer } from '@/components/layout/PageContainer';
import { LexiconClientPageContent } from './LexiconClientPageContent';

export const metadata = {
  title: 'F3 Lexicon - F3 Codex',
  description: 'Explore F3 terminology in the Lexicon.',
};

export default function LexiconPage() {
  return (
    <PageContainer>
      <LexiconClientPageContent />
    </PageContainer>
  );
}