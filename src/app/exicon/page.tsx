// app/exicon/page.tsx

import { PageContainer } from '@/components/layout/PageContainer';
import { ExiconClientPageContent } from './ExiconClientPageContent';

export const metadata = {
  title: 'Exicon - F3 Codex',
  description: 'Explore F3 exercises in the Exicon.',
};

export default function ExiconPage() {
  return (
    <PageContainer>
      <ExiconClientPageContent />
    </PageContainer>
  );
}