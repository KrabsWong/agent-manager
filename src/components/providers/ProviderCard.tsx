/**
 * Provider Card Component
 * 
 * Displays a single provider with actions
 */

import { Zap, Settings, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Provider } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProviderCard({ provider, onSwitch, onEdit, onDelete }: ProviderCardProps) {
  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      official: 'Official',
      cn_official: 'CN Official',
      aggregator: 'Aggregator',
      third_party: 'Third Party',
      cloud_provider: 'Cloud',
      custom: 'Custom',
    };
    return labels[category || 'custom'] || category;
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      official: 'bg-blue-500/10 text-blue-500',
      cn_official: 'bg-red-500/10 text-red-500',
      aggregator: 'bg-purple-500/10 text-purple-500',
      third_party: 'bg-orange-500/10 text-orange-500',
      cloud_provider: 'bg-yellow-500/10 text-yellow-500',
      custom: 'bg-gray-500/10 text-gray-500',
    };
    return colors[category || 'custom'];
  };

  return (
    <Card className={provider.isCurrent ? 'border-primary ring-1 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              {provider.isCurrent && (
                <Badge variant="default" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getCategoryColor(provider.category)}>
                {getCategoryLabel(provider.category)}
              </Badge>
              {provider.websiteUrl && (
                <a
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {provider.settingsConfig.model ? (
              <span>Model: {String(provider.settingsConfig.model)}</span>
            ) : (
              <span>No model configured</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={provider.isCurrent ? 'secondary' : 'default'}
              size="sm"
              onClick={onSwitch}
              disabled={provider.isCurrent}
            >
              {provider.isCurrent ? 'Active' : 'Switch'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
