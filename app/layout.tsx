import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
export const metadata: Metadata = {
  title: 'Tallyroom — exact ranked-choice and STV counting',
  description: 'An open, neutral ranked-choice (IRV) and STV vote counter. Exact fractions, jurisdiction rules, and parity with certified official results.',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#07080a', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}><body className="font-sans min-h-dvh">{children}</body></html>;
}
