import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col gap-2 md:max-w-[360px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-xl border p-4 pr-10 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
  {
    variants: {
      variant: {
        default:
          'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        info: 'border-blue-200/50 bg-gradient-to-r from-blue-50 to-blue-100/80 text-blue-900 dark:border-blue-500/30 dark:from-blue-950/90 dark:to-blue-900/80 dark:text-blue-100',
        success:
          'border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-900 dark:border-emerald-500/30 dark:from-emerald-950/90 dark:to-emerald-900/80 dark:text-emerald-100',
        warning:
          'border-amber-200/50 bg-gradient-to-r from-amber-50 to-amber-100/80 text-amber-900 dark:border-amber-500/30 dark:from-amber-950/90 dark:to-amber-900/80 dark:text-amber-100',
        error:
          'border-rose-200/50 bg-gradient-to-r from-rose-50 to-rose-100/80 text-rose-900 dark:border-rose-500/30 dark:from-rose-950/90 dark:to-rose-900/80 dark:text-rose-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {children}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const iconBgColors = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  info: 'bg-blue-500 text-white shadow-blue-500/30',
  success: 'bg-emerald-500 text-white shadow-emerald-500/30',
  warning: 'bg-amber-500 text-white shadow-amber-500/30',
  error: 'bg-rose-500 text-white shadow-rose-500/30',
};

const ToastIcon = ({
  variant = 'default',
}: {
  variant?: VariantProps<typeof toastVariants>['variant'];
}) => {
  const Icon = iconMap[variant || 'default'];
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-lg',
        iconBgColors[variant || 'default']
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
};

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-lg p-1.5 opacity-40 transition-all hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 focus:opacity-100 focus:outline-none',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-tight', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs font-medium opacity-70 leading-relaxed mt-0.5', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastPrimitives.Action>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastIcon,
};
