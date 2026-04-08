/**
 * EmptyState Component
 *
 * Beautiful, descriptive empty states for non-technical users
 */

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryText?: string;
}

export function EmptyState({ icon, title, description, action, secondaryText }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        {icon && <div className="mb-6 p-4 rounded-full bg-emerald-50 text-emerald-600">{icon}</div>}

        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>

        <p className="text-base text-muted-foreground max-w-md mb-2 leading-relaxed">
          {description}
        </p>

        {secondaryText && (
          <p className="text-sm text-muted-foreground/70 max-w-sm mb-6">{secondaryText}</p>
        )}

        {action && (
          <Button onClick={action.onClick} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
