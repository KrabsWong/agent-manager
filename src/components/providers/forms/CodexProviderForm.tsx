/**
 * Codex Provider Form
 *
 * Tab-based configuration form for Codex provider
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, FileCode, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ProviderFormLayout } from './ProviderFormLayout';

interface CodexProviderFormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface CodexConfig {
  apiKey: string;
  config: string;
  modelName: string;
  baseUrl: string;
  isFullUrl: boolean;
}

const DEFAULT_CODEX_CONFIG = `model_provider = "custom"
model = "gpt-4-turbo-preview"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true`;

export function CodexProviderForm({ initialConfig, onChange }: CodexProviderFormProps) {
  const { t } = useTranslation();
  const [editRawConfig, setEditRawConfig] = useState(false);

  const auth = (initialConfig.auth as Record<string, string>) || {};
  const configString = (initialConfig.config as string) || DEFAULT_CODEX_CONFIG;

  const config: CodexConfig = {
    apiKey: auth.OPENAI_API_KEY || '',
    config: configString,
    modelName: extractModelFromConfig(configString) || 'gpt-4-turbo-preview',
    baseUrl: extractBaseUrlFromConfig(configString) || '',
    isFullUrl: (initialConfig.isFullUrl as boolean) || false,
  };

  const handleChange = <K extends keyof CodexConfig>(key: K, value: CodexConfig[K]) => {
    const newConfig = { ...config, [key]: value };
    onChange({
      auth: { OPENAI_API_KEY: newConfig.apiKey },
      config: newConfig.config,
      isFullUrl: newConfig.isFullUrl,
    });
  };

  const handleModelChange = (model: string) => {
    const newConfigStr = updateConfigModel(config.config, model);
    handleChange('config', newConfigStr);
    handleChange('modelName', model);
  };

  const handleBaseUrlChange = (url: string) => {
    handleChange('baseUrl', url);
    if (url) {
      const newConfigStr = updateConfigBaseUrl(config.config, url);
      handleChange('config', newConfigStr);
    }
  };

  const authTab = {
    id: 'auth',
    label: t('providers.sections.auth'),
    icon: Key,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="codex-api-key" className="text-sm font-medium">
            {t('providers.apiKey')}
          </Label>
          <Input
            id="codex-api-key"
            type="password"
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="sk-..."
          />
          <p className="text-xs text-muted-foreground">{t('providers.codexApiKeyDescription')}</p>
        </div>
      </div>
    ),
  };

  const configTab = {
    id: 'config',
    label: t('providers.sections.quickConfig'),
    icon: FileCode,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {editRawConfig
              ? t('providers.rawConfigDescription')
              : t('providers.codexModelDescription')}
          </p>
          <button
            type="button"
            onClick={() => setEditRawConfig(!editRawConfig)}
            className="text-xs text-primary hover:underline"
          >
            {editRawConfig ? t('providers.useQuickConfig') : t('providers.editRawConfig')}
          </button>
        </div>

        {!editRawConfig ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="codex-model" className="text-sm font-medium">
                {t('providers.model')}
              </Label>
              <Input
                id="codex-model"
                value={config.modelName}
                onChange={(e) => handleModelChange(e.target.value)}
                placeholder="gpt-4-turbo-preview"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codex-base-url" className="text-sm font-medium">
                {t('providers.baseUrl')}
              </Label>
              <Input
                id="codex-base-url"
                value={config.baseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">{t('providers.baseUrlDescription')}</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="codex-full-url" className="text-sm font-medium cursor-pointer">
                  {t('providers.isFullUrl')}
                </Label>
              </div>
              <Switch
                id="codex-full-url"
                checked={config.isFullUrl}
                onCheckedChange={(checked) => handleChange('isFullUrl', checked)}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="codex-raw-config" className="text-sm font-medium">
              {t('providers.rawConfig')}
            </Label>
            <textarea
              id="codex-raw-config"
              value={config.config}
              onChange={(e) => handleChange('config', e.target.value)}
              className="w-full min-h-[280px] px-3 py-2 text-xs font-mono border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              placeholder={DEFAULT_CODEX_CONFIG}
            />
          </div>
        )}
      </div>
    ),
  };

  const helpTab = {
    id: 'help',
    label: t('providers.sections.configReference'),
    icon: BookOpen,
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t('providers.codexConfigHelp1')}</p>
        <code className="block bg-muted p-3 rounded text-xs font-mono">
          model_provider = &quot;custom&quot;{'\n'}
          model = &quot;gpt-4-turbo-preview&quot;{'\n'}
          {'\n'}
          [model_providers.custom]{'\n'}
          base_url = &quot;https://your-endpoint.com&quot;{'\n'}
          name = &quot;custom&quot;{'\n'}
          wire_api = &quot;responses&quot;
        </code>
        <p className="text-muted-foreground">{t('providers.codexConfigHelp2')}</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-1">
          <li>
            <code>wire_api</code>: &quot;responses&quot; | &quot;chat_completions&quot;
          </li>
          <li>
            <code>requires_openai_auth</code>: true | false
          </li>
          <li>
            <code>disable_response_storage</code>: true | false
          </li>
        </ul>
      </div>
    ),
  };

  return <ProviderFormLayout tabs={[authTab, configTab, helpTab]} defaultTab="auth" />;
}

function extractModelFromConfig(config: string): string | null {
  const match = config.match(/^model\s*=\s*"([^"]+)"/m);
  return match ? match[1] : null;
}

function extractBaseUrlFromConfig(config: string): string | null {
  const match = config.match(/base_url\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function updateConfigModel(config: string, model: string): string {
  if (config.includes('model = ')) {
    return config.replace(/^(model\s*=\s*)"[^"]*"/m, `$1"${model}"`);
  }
  return `model = "${model}"\n${config}`;
}

function updateConfigBaseUrl(config: string, baseUrl: string): string {
  if (config.includes('base_url')) {
    return config.replace(/(base_url\s*=\s*)"[^"]*"/, `$1"${baseUrl}"`);
  }
  if (config.includes('[model_providers.custom]')) {
    return config.replace(/(\[model_providers\.custom\])/, `$1\nbase_url = "${baseUrl}"`);
  }
  return config + `\n[model_providers.custom]\nbase_url = "${baseUrl}"`;
}
