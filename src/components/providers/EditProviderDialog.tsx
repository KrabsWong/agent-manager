/**
 * Edit Provider Dialog
 *
 * Complete provider editing with app-specific forms
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ClaudeProviderForm } from './forms/ClaudeProviderForm';
import { CodexProviderForm } from './forms/CodexProviderForm';
import { GeminiProviderForm } from './forms/GeminiProviderForm';
import { OpenCodeProviderForm } from './forms/OpenCodeProviderForm';
import { OpenClawProviderForm } from './forms/OpenClawProviderForm';
import type { Provider, AppType } from '@/types';

interface EditProviderDialogProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, appType: AppType, input: Partial<Provider>) => void;
}

export function EditProviderDialog({ provider, isOpen, onClose, onSave }: EditProviderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [settingsConfig, setSettingsConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setWebsiteUrl(provider.websiteUrl || '');
      setSettingsConfig(provider.settingsConfig || {});
    }
  }, [provider]);

  if (!provider) return null;

  const handleSubmit = () => {
    onSave(provider.id, provider.appType, {
      name,
      websiteUrl,
      settingsConfig,
    });
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const renderProviderForm = () => {
    switch (provider.appType) {
      case 'claude':
        return <ClaudeProviderForm initialConfig={settingsConfig} onChange={setSettingsConfig} />;
      case 'codex':
        return <CodexProviderForm initialConfig={settingsConfig} onChange={setSettingsConfig} />;
      case 'gemini':
        return <GeminiProviderForm initialConfig={settingsConfig} onChange={setSettingsConfig} />;
      case 'opencode':
        return <OpenCodeProviderForm initialConfig={settingsConfig} onChange={setSettingsConfig} />;
      case 'openclaw':
        return <OpenClawProviderForm initialConfig={settingsConfig} onChange={setSettingsConfig} />;
      default:
        return null;
    }
  };

  const getAppTitle = (appType: AppType) => {
    return t(`common.apps.${appType}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto top-32 translate-y-0 data-[state=open]:slide-in-from-top-32 data-[state=closed]:slide-out-to-top-32">
        <DialogHeader>
          <DialogTitle>
            {t('providers.editTitle', { app: getAppTitle(provider.appType) })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic Info - No Card Wrapper */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name" className="text-sm font-medium">
                {t('providers.providerName')}
              </Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('providers.providerNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-website" className="text-sm font-medium">
                {t('providers.websiteUrl')}
              </Label>
              <Input
                id="provider-website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder={t('providers.websiteUrlPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('providers.websiteUrlDescription')}
              </p>
            </div>
          </div>

          {/* App-specific Configuration */}
          {renderProviderForm()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            {t('common.buttons.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            {t('common.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
