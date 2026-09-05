'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/workspace/app-shell';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ApprovalItem {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  totalAmount: string;
  brsScore: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo: string;
  stage: string;
  status: 'pending' | 'approved' | 'returned';
}

const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: 'appr-1',
    quoteId: 'Q-1042',
    quoteNumber: 'Q-1042',
    customerName: 'Acme Corp',
    totalAmount: '$2,750',
    brsScore: 'HIGH',
    riskLevel: 'HIGH',
    stage: 'Sales Manager',
    assignedTo: 'M. Shah',
    status: 'pending',
  },
  {
    id: 'appr-2',
    quoteId: 'Q-1039',
    quoteNumber: 'Q-1039',
    customerName: 'Beta Industries',
    totalAmount: '$950',
    brsScore: 'MEDIUM',
    riskLevel: 'MEDIUM',
    stage: 'Finance',
    assignedTo: 'R. Iyer',
    status: 'pending',
  },
  {
    id: 'appr-3',
    quoteId: 'Q-1035',
    quoteNumber: 'Q-1035',
    customerName: 'Nova Retail',
    totalAmount: '$5,750',
    brsScore: 'LOW',
    riskLevel: 'LOW',
    stage: 'Auto Approved',
    assignedTo: 'Auto Approved',
    status: 'approved',
  },
];

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<'pending' | 'returned' | 'approved'>('pending');

  const filteredApprovals = MOCK_APPROVALS.filter((item) => {
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'returned') return item.status === 'returned';
    if (filter === 'approved') return item.status === 'approved';
    return true;
  });

  return (
    <AppShell
      headerTitle="Approvals (List)"
      headerSubtitle="Every quotation that exceeded limits, or is going through discount approval"
    >
      <div className="space-y-6">
        {/* Urgent Triage Filter Badges strictly matching Screen 5 in PNG */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'pending'
                ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            3 Pending
          </button>
          <button
            onClick={() => setFilter('returned')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'returned'
                ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            1 Returned
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'approved'
                ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            2 Approved
          </button>
        </div>

        {/* Hairline-Ruled Table matching Screen 5 */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-neutral-900/50">
              <TableRow className="border-b border-border">
                <TableHead className="text-xs uppercase tracking-wider text-neutral-400 font-medium py-3 px-4">
                  Quotation
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-neutral-400 font-medium py-3 px-4">
                  Customer
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-neutral-400 font-medium py-3 px-4">
                  Blended Risk
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-neutral-400 font-medium py-3 px-4">
                  Stage
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-neutral-400 font-medium py-3 px-4">
                  Assigned To
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {filteredApprovals.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-neutral-900/50 cursor-pointer transition-colors"
                >
                  <TableCell className="py-3 px-4 font-mono font-medium text-white text-xs">
                    {item.quoteNumber}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-xs text-neutral-200">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-xs font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.riskLevel === 'HIGH'
                          ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                          : item.riskLevel === 'MEDIUM'
                            ? 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {item.brsScore}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-xs text-neutral-300">
                    {item.stage}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-xs text-neutral-300">
                    {item.assignedTo}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Helpful text footer from Screen 5 */}
        <p className="text-xs text-muted-foreground">
          Click any row to open full approval detail, risk breakdown, and audit trail.
        </p>
      </div>
    </AppShell>
  );
}
