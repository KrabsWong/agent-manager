/**
 * Provider Card Component
 *
 * Clean single-row layout with hover-reveal actions
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Trash2, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Provider } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  onSwitch: () => void;
  onDeactivate?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProviderCard({
  provider,
  onSwitch,
  onDeactivate,
  onEdit,
  onDelete,
}: ProviderCardProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      official: t('providers.categories.official'),
      cn_official: t('providers.categories.cnOfficial'),
      aggregator: t('providers.categories.aggregator'),
      third_party: t('providers.categories.thirdParty'),
      cloud_provider: t('providers.categories.cloud'),
      custom: t('providers.categories.custom'),
    };
    return labels[category || 'custom'] || category;
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      official: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      cn_official: 'bg-red-500/10 text-red-600 border-red-500/20',
      aggregator: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      third_party: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      cloud_provider: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      custom: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    };
    return colors[category || 'custom'];
  };

  const handleToggle = () => {
    if (provider.isCurrent) {
      onDeactivate?.();
    } else {
      onSwitch();
    }
  };

  const categoryLabel = getCategoryLabel(provider.category);
  const modelValue = provider.settingsConfig?.model ? String(provider.settingsConfig.model) : null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 border',
        provider.isCurrent ? 'border-primary shadow-sm' : 'hover:border-muted-foreground/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Selection indicator */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center justify-center w-4 h-4 rounded-full transition-all shrink-0',
              provider.isCurrent
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:border-muted-foreground'
            )}
          >
            <Check className={cn('w-2 h-2', provider.isCurrent ? 'opacity-100' : 'opacity-0')} />
          </button>

          {/* Content - single line */}
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
            <span className="font-medium text-sm truncate">{provider.name}</span>

            <Badge
              variant="outline"
              className={`text-[10px] h-5 px-1.5 shrink-0 ${getCategoryColor(provider.category)}`}
            >
              {categoryLabel}
            </Badge>

            {provider.websiteUrl && (
              <a
                href={provider.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {modelValue && (
              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate">
                {modelValue}
              </code>
            )}
          </div>

          {/* Actions - hover reveal */}
          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-7 w-7"
              title={t('common.buttons.edit')}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-destructive hover:text-destructive"
              title={t('common.buttons.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
