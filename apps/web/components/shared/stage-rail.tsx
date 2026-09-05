'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface StageStep {
  id: string;
  label: string;
  description?: string;
}

interface StageRailProps {
  steps: StageStep[];
  currentStepIndex: number;
  className?: string;
}

export function StageRail({
  steps,
  currentStepIndex,
  className,
}: StageRailProps) {
  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <div className={cn('w-full py-4', className)}>
      {/* Mobile view (< 640px) */}
      <div className="sm:hidden flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border/80">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stage {currentStepIndex + 1} of {steps.length}
          </span>
          <h4 className="text-sm font-semibold text-white mt-0.5">
            {currentStep?.label}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                idx === currentStepIndex
                  ? 'w-6 bg-flow'
                  : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-slate-800'
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop / Tablet horizontal stage rail */}
      <div className="hidden sm:flex items-center justify-between relative w-full">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Connector line between nodes */}
              {idx > 0 && (
                <div className="flex-1 h-[2px] mx-2 transition-colors duration-300 relative">
                  <div
                    className={cn(
                      'h-full w-full',
                      isDone
                        ? 'bg-emerald-500/60'
                        : isCurrent
                          ? 'bg-gradient-to-r from-emerald-500/60 to-flow/60'
                          : 'bg-slate-800'
                    )}
                  />
                </div>
              )}

              {/* Stage Node */}
              <div className="flex flex-col items-center group relative cursor-default">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-300',
                    isDone &&
                      'bg-emerald-500/15 border border-emerald-500 text-emerald-300',
                    isCurrent &&
                      'bg-flow text-white border-2 border-white/80 shadow-[0_0_15px_rgba(59,91,169,0.5)] scale-110',
                    isUpcoming &&
                      'bg-slate-900 border border-slate-700/80 text-slate-500'
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <span
                  className={cn(
                    'text-xs font-medium mt-2 whitespace-nowrap transition-colors',
                    isCurrent
                      ? 'text-white font-semibold'
                      : isDone
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
