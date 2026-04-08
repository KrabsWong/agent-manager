/**
 * Edit Provider Dialog
 * 
 * Dialog for editing provider settings
 */

import { useState, useEffect } from 'react';
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
          <h2 className="text-xl font-semibold mb-4">Edit Provider</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Provider Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Provider name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-api-key">API Key</Label>
              <Input
                id="edit-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep current API key
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-base-url">Base URL (Optional)</Label>
              <Input
                id="edit-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model name"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
