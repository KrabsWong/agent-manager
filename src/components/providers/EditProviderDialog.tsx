/**
 * Edit Provider Dialog
 *
 * Dialog for editing provider settings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Provider, AppType } from '@/types';

interface EditProviderDialogProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, appType: AppType, settings: Record<string, unknown>) => void;
}

export function EditProviderDialog({ provider, isOpen, onClose, onSave }: EditProviderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setApiKey((provider.settingsConfig.apiKey as string) || '');
      setBaseUrl((provider.settingsConfig.baseUrl as string) || '');
      setModel((provider.settingsConfig.model as string) || '');
    }
  }, [provider]);

  if (!isOpen || !provider) return null;

  const handleSubmit = () => {
    const updatedSettings = {
      ...provider.settingsConfig,
      name,
      apiKey: apiKey || provider.settingsConfig.apiKey,
      baseUrl: baseUrl || provider.settingsConfig.baseUrl,
      model: model || provider.settingsConfig.model,
    };

    onSave(provider.id, provider.appType, updatedSettings);
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('providers.editProvider')}</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('providers.providerName')}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('providers.providerNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-api-key">{t('providers.apiKey')}</Label>
              <Input
                id="edit-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('providers.enterApiKey')}
              />
              <p className="text-xs text-muted-foreground">{t('providers.leaveEmptyKeepKey')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-base-url">{t('providers.baseUrl')}</Label>
              <Input
                id="edit-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t('providers.baseUrlPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-model">{t('providers.model')}</Label>
              <Input
                id="edit-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t('providers.modelPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
