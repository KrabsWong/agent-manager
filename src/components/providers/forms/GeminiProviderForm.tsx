/**
 * Gemini Provider Form
 *
 * Tab-based configuration form for Gemini provider
 */

import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProviderFormLayout, Key, Globe, Cpu } from './ProviderFormLayout';

interface GeminiProviderFormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function GeminiProviderForm({ initialConfig, onChange }: GeminiProviderFormProps) {
  const { t } = useTranslation();

  const env = (initialConfig.env as Record<string, string>) || {};

  const config: GeminiConfig = {
    apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '',
    baseUrl: env.GOOGLE_GEMINI_BASE_URL || '',
    model: (initialConfig.model as string) || env.GEMINI_MODEL || 'gemini-1.5-pro-latest',
  };

  const handleChange = (key: keyof GeminiConfig, value: string) => {
    const newConfig = { ...config, [key]: value };

    onChange({
      env: {
        GEMINI_API_KEY: newConfig.apiKey,
        GOOGLE_GEMINI_BASE_URL: newConfig.baseUrl,
        GEMINI_MODEL: newConfig.model,
      },
      model: newConfig.model,
    });
  };

  const authTab = {
    id: 'auth',
    label: t('providers.sections.auth'),
    icon: Key,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gemini-api-key" className="text-sm font-medium">
            {t('providers.apiKey')}
          </Label>
          <Input
            id="gemini-api-key"
            type="password"
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="AIza..."
          />
          <p className="text-xs text-muted-foreground">{t('providers.geminiApiKeyDescription')}</p>
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
          <Label htmlFor="gemini-base-url" className="text-sm font-medium">
            {t('providers.baseUrl')}
          </Label>
          <Input
            id="gemini-base-url"
            value={config.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            placeholder="https://generativelanguage.googleapis.com"
          />
          <p className="text-xs text-muted-foreground">{t('providers.baseUrlDescription')}</p>
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
          <Label htmlFor="gemini-model" className="text-sm font-medium">
            {t('providers.model')}
          </Label>
          <Input
            id="gemini-model"
            value={config.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="gemini-1.5-pro-latest"
          />
          <p className="text-xs text-muted-foreground">{t('providers.geminiModelDescription')}</p>
        </div>
      </div>
    ),
  };

  return <ProviderFormLayout tabs={[authTab, endpointTab, modelTab]} defaultTab="auth" />;
}
