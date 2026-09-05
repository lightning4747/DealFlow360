import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KpiTileProps {
  label: string;
  value: string | number;
  delta?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  glow?: boolean;
}

export function KpiTile({
  label,
  value,
  delta,
  isPositive,
  icon: Icon,
  description,
  className,
  glow = false,
}: KpiTileProps) {
  return (
    <Card glass glow={glow} className={cn('overflow-hidden relative', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          {Icon && (
            <div className="p-2 rounded-xl bg-slate-800/80 border border-white/[0.06] text-flow">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
            {value}
          </h3>
          {delta && (
            <span
              className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded-md border',
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              )}
            >
              {delta}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
