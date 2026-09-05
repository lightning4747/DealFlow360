import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Info } from 'lucide-react';

export type StatusType =
  | 'done'
  | 'approved'
  | 'confirmed'
  | 'paid'
  | 'fulfilled'
  | 'pending'
  | 'draft'
  | 'under_negotiation'
  | 'pending_approval'
  | 'awaiting_stock'
  | 'blocked'
  | 'rejected'
  | 'cancelled'
  | 'at_risk'
  | 'stockout'
  | 'overdue'
  | 'info'
  | 'sent';

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export function StatusChip({
  status,
  label,
  size = 'default',
  showIcon = true,
  className,
  ...props
}: StatusChipProps) {
  const norm = status.toLowerCase();

  let category: 'success' | 'warning' | 'destructive' | 'flow' | 'neutral' = 'neutral';
  let Icon = Info;
  let displayLabel = label || status.replace(/_/g, ' ');

  if (['done', 'approved', 'confirmed', 'paid', 'fulfilled', 'active'].includes(norm)) {
    category = 'success';
    Icon = CheckCircle2;
  } else if (
    [
      'pending',
      'draft',
      'under_negotiation',
      'pending_approval',
      'awaiting_stock',
      'trial',
    ].includes(norm)
  ) {
    category = 'warning';
    Icon = Clock;
  } else if (
    [
      'blocked',
      'rejected',
      'cancelled',
      'at_risk',
      'stockout',
      'overdue',
    ].includes(norm)
  ) {
    category = 'destructive';
    Icon = XCircle;
  } else if (['sent', 'shipped', 'invoiced'].includes(norm)) {
    category = 'flow';
    Icon = Info;
  }

  const styles = {
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    destructive: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    flow: 'bg-flow/15 text-blue-300 border-flow/30',
    neutral: 'bg-slate-800/80 text-slate-300 border-white/[0.08]',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    destructive: 'bg-rose-400',
    flow: 'bg-blue-400',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        styles[category],
        className
      )}
      {...props}
    >
      {showIcon ? (
        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      ) : (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[category])} />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
