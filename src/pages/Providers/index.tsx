/**
 * Providers Page
 *
 * Main page for managing AI providers
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Zap, Bot, Sparkles, Terminal, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { AddProviderDialog } from '@/components/providers/AddProviderDialog';
import { EditProviderDialog } from '@/components/providers/EditProviderDialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useProviders,
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
  useSwitchProvider,
} from '@/hooks/useProviders';
import type { AppType, Provider, CreateProviderInput } from '@/types';

const APP_TYPES: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

const APP_ICONS: Record<AppType, React.ReactNode> = {
  claude: <Bot className="h-4 w-4" />,
  codex: <Terminal className="h-4 w-4" />,
  gemini: <Sparkles className="h-4 w-4" />,
  opencode: <Code2 className="h-4 w-4" />,
  openclaw: <Zap className="h-4 w-4" />,
};

const APP_COLORS: Record<AppType, string> = {
  claude: 'text-emerald-600',
  codex: 'text-teal-600',
  gemini: 'text-green-600',
  opencode: 'text-lime-600',
  openclaw: 'text-emerald-700',
};

export function ProvidersPage() {
  const { t } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const { data: providers, isLoading, error, refetch } = useProviders(selectedApp);
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  const switchProvider = useSwitchProvider();

  const handleAddProvider = (input: CreateProviderInput) => {
    createProvider.mutate(input, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
      },
    });
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
  };

  const handleSaveEdit = (id: string, appType: AppType, settings: Record<string, unknown>) => {
    updateProvider.mutate(
      {
        id,
        appType,
        input: { settingsConfig: settings },
      },
      {
        onSuccess: () => {
          setEditingProvider(null);
        },
      }
    );
  };

  const handleDeleteProvider = (id: string, appType: AppType) => {
    if (deleteProvider.isPending) return; // Prevent double submission
    if (confirm(t('providers.deleteConfirm'))) {
      deleteProvider.mutate({ id, appType });
    }
  };

  const handleSwitchProvider = (id: string, appType: AppType) => {
    switchProvider.mutate({ id, appType });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('providers.title')}</h1>
          <p className="text-muted-foreground">{t('providers.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('providers.addProvider')}
          </Button>
        </div>
      </div>

      {/* App Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t('providers.application')}:</span>
        <Select value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppType)}>
          <SelectTrigger className="w-48">
            <div className="flex items-center gap-2">
              <span className={APP_COLORS[selectedApp]}>{APP_ICONS[selectedApp]}</span>
              <span>{selectedApp.charAt(0).toUpperCase() + selectedApp.slice(1)}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {APP_TYPES.map((app) => (
              <SelectItem key={app} value={app}>
                <div className="flex items-center gap-2">
                  <span className={APP_COLORS[app]}>{APP_ICONS[app]}</span>
                  <span>{app.charAt(0).toUpperCase() + app.slice(1)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Providers List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('providers.loading')}</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">
            {t('providers.errorLoading')}: {error.message}
          </div>
        </div>
      ) : providers?.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-8 w-8" />}
          title={t('providers.noProviders')}
          description="AI providers are the services that power your coding assistant. Think of them like choosing which AI brain to use for your coding tasks."
          secondaryText="Popular options include Claude (for thoughtful coding), GPT-4 (for versatile tasks), or DeepSeek (for Chinese language support)."
          action={{
            label: t('providers.addFirstProvider'),
            onClick: () => setIsAddDialogOpen(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {providers?.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onSwitch={() => handleSwitchProvider(provider.id, provider.appType)}
              onEdit={() => handleEditProvider(provider)}
              onDelete={() => handleDeleteProvider(provider.id, provider.appType)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddProviderDialog
        appType={selectedApp}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddProvider}
      />

      <EditProviderDialog
        provider={editingProvider}
        isOpen={!!editingProvider}
        onClose={() => setEditingProvider(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
