import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DealFlow360 — Enterprise Quotation & Deal Execution Platform',
  description: 'Self-Governing Sales Operations, Margin Intelligence & Dynamic Quotation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-foreground font-sans min-h-screen antialiased selection:bg-flow/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
