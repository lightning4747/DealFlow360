import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DealFlow360 — Sales & Quotation Platform',
  description: 'B2B Sales, Quotation & Order Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
