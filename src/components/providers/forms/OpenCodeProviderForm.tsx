/**
 * OpenCode Provider Form
 *
 * Tab-based configuration form for OpenCode provider
 */

import { useTranslation } from 'react-i18next';
import { Key, Globe, Cpu, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ProviderFormLayout } from './ProviderFormLayout';

interface OpenCodeProviderFormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface OpenCodeConfig {
  providerKey: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export function OpenCodeProviderForm({ initialConfig, onChange }: OpenCodeProviderFormProps) {
  const { t } = useTranslation();

  const options = (initialConfig.options as Record<string, unknown>) || {};

  const config: OpenCodeConfig = {
    providerKey: (initialConfig.providerKey as string) || '',
    apiKey: (options.apiKey as string) || (options.api_key as string) || '',
    baseUrl: (options.baseUrl as string) || (options.base_url as string) || '',
    model: (options.model as string) || '',
    enabled: (initialConfig.enabled as boolean) ?? true,
  };

  const handleChange = (key: keyof OpenCodeConfig, value: string | boolean) => {
    const newConfig = { ...config, [key]: value };
    onChange({
      providerKey: newConfig.providerKey,
      enabled: newConfig.enabled,
      options: {
        apiKey: newConfig.apiKey,
        baseUrl: newConfig.baseUrl,
        model: newConfig.model,
      },
    });
  };

  const basicTab = {
    id: 'basic',
    label: t('providers.sections.basic'),
    icon: ToggleRight,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="opencode-enabled" className="text-sm font-medium cursor-pointer">
              {t('providers.enabled')}
            </Label>
          </div>
          <Switch
            id="opencode-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opencode-key" className="text-sm font-medium">
            {t('providers.providerKey')}
          </Label>
          <Input
            id="opencode-key"
            value={config.providerKey}
            onChange={(e) => handleChange('providerKey', e.target.value)}
            placeholder="my-provider"
          />
          <p className="text-xs text-muted-foreground">{t('providers.providerKeyDescription')}</p>
        </div>
      </div>
    ),
  };

  const authTab = {
    id: 'auth',
    label: t('providers.sections.auth'),
    icon: Key,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="opencode-api-key" className="text-sm font-medium">
            {t('providers.apiKey')}
          </Label>
          <Input
            id="opencode-api-key"
            type="password"
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="sk-..."
          />
        </div>
      </div>
    ),
  };

  const endpointTab = {
    id: 'endpoint',
    label: t('providers.sections.endpoint'),
    icon: Globe,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="opencode-base-url" className="text-sm font-medium">
            {t('providers.baseUrl')}
          </Label>
          <Input
            id="opencode-base-url"
            value={config.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </div>
      </div>
    ),
  };

  const modelTab = {
    id: 'model',
    label: t('providers.sections.model'),
    icon: Cpu,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="opencode-model" className="text-sm font-medium">
            {t('providers.model')}
          </Label>
          <Input
            id="opencode-model"
            value={config.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="gpt-4-turbo"
          />
          <p className="text-xs text-muted-foreground">{t('providers.modelDescription')}</p>
        </div>
      </div>
    ),
  };

  return (
    <ProviderFormLayout tabs={[basicTab, authTab, endpointTab, modelTab]} defaultTab="basic" />
  );
}
