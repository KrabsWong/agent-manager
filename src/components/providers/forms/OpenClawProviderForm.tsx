/**
 * OpenClaw Provider Form
 *
 * Tab-based configuration form for OpenClaw provider
 */

import { useTranslation } from 'react-i18next';
import { Key, Globe, Cpu, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ProviderFormLayout } from './ProviderFormLayout';

interface OpenClawProviderFormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface OpenClawConfig {
  providerName: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
}

export function OpenClawProviderForm({ initialConfig, onChange }: OpenClawProviderFormProps) {
  const { t } = useTranslation();

  const models = (initialConfig.models as Record<string, unknown>) || {};
  const providers = (models.providers as Array<Record<string, unknown>>) || [];
  const firstProvider = providers[0] || {};

  const config: OpenClawConfig = {
    providerName: (firstProvider.name as string) || '',
    apiKey: (firstProvider.apiKey as string) || '',
    baseUrl: (firstProvider.baseUrl as string) || '',
    model: (firstProvider.model as string) || '',
    isDefault: (firstProvider.default as boolean) || false,
  };

  const handleChange = (key: keyof OpenClawConfig, value: string | boolean) => {
    const newConfig = { ...config, [key]: value };
    onChange({
      models: {
        providers: [
          {
            name: newConfig.providerName,
            apiKey: newConfig.apiKey,
            baseUrl: newConfig.baseUrl,
            model: newConfig.model,
            default: newConfig.isDefault,
          },
        ],
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
            <Label htmlFor="openclaw-default" className="text-sm font-medium cursor-pointer">
              {t('providers.isDefault')}
            </Label>
          </div>
          <Switch
            id="openclaw-default"
            checked={config.isDefault}
            onCheckedChange={(checked) => handleChange('isDefault', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openclaw-name" className="text-sm font-medium">
            {t('providers.providerName')}
          </Label>
          <Input
            id="openclaw-name"
            value={config.providerName}
            onChange={(e) => handleChange('providerName', e.target.value)}
            placeholder="my-provider"
          />
          <p className="text-xs text-muted-foreground">{t('providers.providerNameDescription')}</p>
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
          <Label htmlFor="openclaw-api-key" className="text-sm font-medium">
            {t('providers.apiKey')}
          </Label>
          <Input
            id="openclaw-api-key"
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
          <Label htmlFor="openclaw-base-url" className="text-sm font-medium">
            {t('providers.baseUrl')}
          </Label>
          <Input
            id="openclaw-base-url"
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
          <Label htmlFor="openclaw-model" className="text-sm font-medium">
            {t('providers.model')}
          </Label>
          <Input
            id="openclaw-model"
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
