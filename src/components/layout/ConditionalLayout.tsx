'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if we're running in an iframe
    setIsInIframe(window !== window.parent);
  }, []);

  return (
    <>
      {!isInIframe && <Header />}
      <main className="flex-grow">{children}</main>
      {!isInIframe && <Footer />}
    </>
  );
}