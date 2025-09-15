import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { Geist } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';

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
        {isProxied ? (
          <iframe
            src="/f3-header"
            style={{ width: '100%', height: '70px', border: 'none' }}
          ></iframe>
        ) : (
          <Header />
        )}
        <main className="flex-grow">{children}</main>
        {isProxied ? (
          <iframe
            src="/f3-footer"
            style={{ width: '100%', height: '100px', border: 'none' }}
          ></iframe>
        ) : (
          <Footer />
        )}
        <Toaster />
        <Script id="iframe-height-reporter" strategy="afterInteractive">
          {`
            function sendHeight() {
              const height = document.documentElement.scrollHeight;
              window.parent.postMessage({ frameHeight: height }, "https://f3nation.com");
            }

            window.addEventListener("load", sendHeight);
            window.addEventListener("resize", sendHeight);

            new MutationObserver(sendHeight).observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true
            });
          `}
        </Script>
      </body>
    </html>
  );
}
