/**
 * UI Components - Spinner
 *
 * Loading spinner/loader component
 */

import { cn } from '@/lib/utils';

export interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
