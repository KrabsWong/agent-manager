/**
 * Providers Page
 *
 * Main page for managing AI providers
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Bot } from 'lucide-react';
import { APP_COLORS, APP_TYPES, getAppIcon } from '@/components/AppIcons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { AddProviderDialog } from '@/components/providers/AddProviderDialog';
import { EditProviderDialog } from '@/components/providers/EditProviderDialog';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useProviders,
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
  useSwitchProvider,
  useDeactivateProvider,
} from '@/hooks/useProviders';
import type { AppType, Provider, CreateProviderInput } from '@/types';

export function ProvidersPage() {
  const { t } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  const { data: providers, isLoading, error, refetch } = useProviders(selectedApp);
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  const switchProvider = useSwitchProvider();
  const deactivateProvider = useDeactivateProvider();

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

  const handleSaveEdit = (id: string, appType: AppType, input: Partial<Provider>) => {
    updateProvider.mutate(
      {
        id,
        appType,
        input,
      },
      {
        onSuccess: () => {
          setEditingProvider(null);
        },
      }
    );
  };

  const handleDeleteClick = (provider: Provider) => {
    if (deleteProvider.isPending) return; // Prevent double submission
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (providerToDelete) {
      deleteProvider.mutate({ id: providerToDelete.id, appType: providerToDelete.appType });
    }
    setProviderToDelete(null);
  };

  const handleSwitchProvider = (id: string, appType: AppType) => {
    switchProvider.mutate({ id, appType });
  };

  const handleDeactivateProvider = (appType: AppType) => {
    deactivateProvider.mutate({ appType });
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
              <span className={APP_COLORS[selectedApp]}>{getAppIcon(selectedApp)}</span>
              <span>{t(`common.apps.${selectedApp}`)}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {APP_TYPES.map((app) => (
              <SelectItem key={app} value={app}>
                <div className="flex items-center gap-2">
                  <span className={APP_COLORS[app]}>{getAppIcon(app)}</span>
                  <span>{t(`common.apps.${app}`)}</span>
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
          description={t('providers.noProvidersDesc')}
          secondaryText={t('providers.noProvidersSecondary')}
        />
      ) : (
        <div className="grid gap-4">
          {providers?.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onSwitch={() => handleSwitchProvider(provider.id, provider.appType)}
              onDeactivate={() => handleDeactivateProvider(provider.appType)}
              onEdit={() => handleEditProvider(provider)}
              onDelete={() => handleDeleteClick(provider)}
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('common.buttons.delete')}
        description={t('providers.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  );
}
