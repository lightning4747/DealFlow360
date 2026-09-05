import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

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
  title: 'DealFlow360 — Enterprise Quotation & Sales Operations Platform',
  description: 'Self-Governing Sales Operations, Margin Intelligence & Dynamic Quotation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", dmSans.variable, jetbrainsMono.variable)}>
      <body className="bg-background text-foreground font-sans min-h-screen antialiased selection:bg-foreground/20 selection:text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
