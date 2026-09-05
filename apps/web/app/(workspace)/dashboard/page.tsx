'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/workspace/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <AppShell
      headerTitle="Sales Dashboard / Home"
      headerSubtitle="Central hub, links out to every module below"
    >
      <div className="space-y-8">
        {/* KPI / Status Summary Row strictly matching Screen 2 in PNG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/approvals" className="group block">
            <Card className="bg-card hover:bg-accent/40 border border-border transition-colors cursor-pointer">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-white group-hover:text-neutral-200">
                  Pending Approvals
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  4 quotations waiting
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/quotations" className="group block">
            <Card className="bg-card hover:bg-accent/40 border border-border transition-colors cursor-pointer">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-white group-hover:text-neutral-200">
                  Open Quotations
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  12 active deals
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/deal-health" className="group block">
            <Card className="bg-card hover:bg-accent/40 border border-border transition-colors cursor-pointer">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-white group-hover:text-neutral-200">
                  At-Risk Deals
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  3 flagged by Deal Health
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3">
          <Button asChild className="bg-neutral-100 hover:bg-white text-neutral-950 font-medium px-4 py-2 text-xs">
            <Link href="/quotations">+ New Quotation</Link>
          </Button>
          <Button asChild variant="outline" className="border-border text-neutral-300 hover:bg-neutral-800 text-xs">
            <Link href="/approvals">View Approvals</Link>
          </Button>
        </div>

        {/* Recent Activity List matching Screen 2 */}
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-300">
            Recent Activity
          </h2>
          <div className="space-y-2.5 text-xs text-neutral-300 border-l border-border pl-4">
            <p className="hover:text-white transition">
              • Acme Corp quotation approved by Finance
            </p>
            <p className="hover:text-white transition">
              • Beta Industries requested a discount change
            </p>
            <p className="hover:text-white transition">
              • East Depot stock updated for Order A1291
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
