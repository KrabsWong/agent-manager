/**
 * EmptyState Component
 *
 * Beautiful, descriptive empty states for non-technical users
 * Compact version - no duplicate action buttons
 */

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  secondaryText?: string;
}

export function EmptyState({ icon, title, description, secondaryText }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
        {icon && <div className="mb-4 p-3 rounded-full bg-emerald-50 text-emerald-600">{icon}</div>}

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        <p className="text-sm text-muted-foreground max-w-md mb-2 leading-relaxed">{description}</p>

        {secondaryText && (
          <p className="text-xs text-muted-foreground/70 max-w-sm">{secondaryText}</p>
        )}
      </CardContent>
    </Card>
  );
}
