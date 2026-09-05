import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border border-flow/30 bg-flow/15 text-blue-300 shadow-sm',
        secondary:
          'border border-white/[0.08] bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        success:
          'border border-success/30 bg-success/15 text-emerald-300',
        warning:
          'border border-warning/30 bg-warning/15 text-amber-300',
        destructive:
          'border border-destructive/30 bg-destructive/15 text-rose-300',
        muted:
          'border border-white/[0.06] bg-slate-900/60 text-slate-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
