import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DealFlow360 — Enterprise Quotation Platform',
  description: 'Self-Governing Sales Operations & Dynamic Quotation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
