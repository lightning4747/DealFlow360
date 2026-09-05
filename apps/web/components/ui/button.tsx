import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-flow text-primary-foreground shadow-md shadow-flow/20 hover:bg-flow/90 border border-flow/30',
        destructive:
          'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 hover:text-white',
        destructiveSolid:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline:
          'border border-border/80 bg-secondary/40 hover:bg-secondary hover:text-foreground backdrop-blur-sm',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/[0.06]',
        ghost:
          'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
        link: 'text-flow underline-offset-4 hover:underline p-0 h-auto font-normal',
        success:
          'bg-success/15 text-success border border-success/30 hover:bg-success/25 hover:text-white',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-10 rounded-xl px-6 text-base',
        icon: 'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
