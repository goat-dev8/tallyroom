import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as React from 'react';
export const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(...a));
export const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tally disabled:opacity-50 disabled:pointer-events-none', {
  variants: {
    variant: { primary: 'bg-fg text-ink hover:bg-white', ghost: 'text-fg/80 hover:text-fg hover:bg-white/5', outline: 'border border-line text-fg hover:bg-white/5', tally: 'bg-tally text-ink hover:brightness-110' },
    size: { sm: 'h-8 px-3', md: 'h-10 px-4', icon: 'h-8 w-8' },
  }, defaultVariants: { variant: 'primary', size: 'md' },
});
export function Button({ className, variant, size, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...p} />;
}
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border border-line bg-white/[.03] px-2.5 py-0.5 text-xs text-mute', className)} {...p} />;
}
