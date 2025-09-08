import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { Geist } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'F3 Codex - Exicon & Lexicon',
  description: 'The official Exicon and Lexicon for F3 Nation.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProxied = (await headers()).has('X-F3-Worker-Proxy');

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning={true}
      >
        {!isProxied && <Header />}
        <main className="flex-grow">{children}</main>
        {!isProxied && <Footer />}
        <Toaster />
      </body>
    </html>
  );
}
