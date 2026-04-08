/**
 * Claude Provider Form
 *
 * Tab-based configuration form for Claude provider
 */

import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProviderFormLayout, Key, Globe, Cpu, SlidersHorizontal } from './ProviderFormLayout';

interface ClaudeProviderFormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface ClaudeConfig {
  apiKey: string;
  apiKeyField: 'ANTHROPIC_AUTH_TOKEN' | 'ANTHROPIC_API_KEY';
  baseUrl: string;
  isFullUrl: boolean;
  model: string;
  reasoningModel: string;
  defaultHaikuModel: string;
  defaultSonnetModel: string;
  defaultOpusModel: string;
  apiFormat: 'anthropic' | 'openai_chat' | 'openai_responses';
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  systemPrompt: string;
}

export function ClaudeProviderForm({ initialConfig, onChange }: ClaudeProviderFormProps) {
  const { t } = useTranslation();

  const config: ClaudeConfig = {
    apiKey: (initialConfig.apiKey as string) || '',
    apiKeyField:
      (initialConfig.apiKeyField as ClaudeConfig['apiKeyField']) || 'ANTHROPIC_AUTH_TOKEN',
    baseUrl: (initialConfig.baseUrl as string) || '',
    isFullUrl: (initialConfig.isFullUrl as boolean) || false,
    model: (initialConfig.model as string) || 'claude-3-opus-20240229',
    reasoningModel: (initialConfig.reasoningModel as string) || '',
    defaultHaikuModel: (initialConfig.defaultHaikuModel as string) || 'claude-3-haiku-20240307',
    defaultSonnetModel: (initialConfig.defaultSonnetModel as string) || 'claude-3-sonnet-20240229',
    defaultOpusModel: (initialConfig.defaultOpusModel as string) || 'claude-3-opus-20240229',
    apiFormat: (initialConfig.apiFormat as ClaudeConfig['apiFormat']) || 'anthropic',
    maxTokens: (initialConfig.maxTokens as number) || 4096,
    temperature: (initialConfig.temperature as number) || 0.7,
    topP: (initialConfig.topP as number) || 1,
    topK: (initialConfig.topK as number) || 0,
    systemPrompt: (initialConfig.systemPrompt as string) || '',
  };

  const handleChange = <K extends keyof ClaudeConfig>(key: K, value: ClaudeConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const authTab = {
    id: 'auth',
    label: t('providers.sections.auth'),
    icon: Key,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="claude-api-key-field" className="text-sm font-medium">
            {t('providers.apiKeyField')}
          </Label>
          <Select
            value={config.apiKeyField}
            onValueChange={(value) =>
              handleChange('apiKeyField', value as ClaudeConfig['apiKeyField'])
            }
          >
            <SelectTrigger id="claude-api-key-field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANTHROPIC_AUTH_TOKEN">ANTHROPIC_AUTH_TOKEN (Default)</SelectItem>
              <SelectItem value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY (Legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-api-key" className="text-sm font-medium">
            {t('providers.apiKey')}
          </Label>
          <Input
            id="claude-api-key"
            type="password"
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="sk-..."
          />
          <p className="text-xs text-muted-foreground">{t('providers.apiKeyDescription')}</p>
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
          <Label htmlFor="claude-base-url" className="text-sm font-medium">
            {t('providers.baseUrl')}
          </Label>
          <Input
            id="claude-base-url"
            value={config.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            placeholder="https://api.anthropic.com"
          />
          <p className="text-xs text-muted-foreground">{t('providers.baseUrlDescription')}</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="claude-full-url" className="text-sm font-medium cursor-pointer">
              {t('providers.isFullUrl')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('providers.isFullUrlDescription')}</p>
          </div>
          <Switch
            id="claude-full-url"
            checked={config.isFullUrl}
            onCheckedChange={(checked) => handleChange('isFullUrl', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-api-format" className="text-sm font-medium">
            {t('providers.apiFormat')}
          </Label>
          <Select
            value={config.apiFormat}
            onValueChange={(value) => handleChange('apiFormat', value as ClaudeConfig['apiFormat'])}
          >
            <SelectTrigger id="claude-api-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic Native (Messages API)</SelectItem>
              <SelectItem value="openai_chat">OpenAI Compatible (Chat Completions)</SelectItem>
              <SelectItem value="openai_responses">OpenAI Compatible (Responses API)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('providers.apiFormatDescription')}</p>
        </div>
      </div>
    ),
  };

  const modelsTab = {
    id: 'models',
    label: t('providers.sections.models'),
    icon: Cpu,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="claude-model" className="text-sm font-medium">
            {t('providers.primaryModel')}
          </Label>
          <Input
            id="claude-model"
            value={config.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="claude-3-opus-20240229"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-reasoning-model" className="text-sm font-medium">
            {t('providers.reasoningModel')}
          </Label>
          <Input
            id="claude-reasoning-model"
            value={config.reasoningModel}
            onChange={(e) => handleChange('reasoningModel', e.target.value)}
            placeholder="claude-3-opus-20240229"
          />
          <p className="text-xs text-muted-foreground">
            {t('providers.reasoningModelDescription')}
          </p>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t('providers.sections.models')} (Variants)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="claude-haiku" className="text-xs text-muted-foreground">
                {t('providers.haikuModel')}
              </Label>
              <Input
                id="claude-haiku"
                value={config.defaultHaikuModel}
                onChange={(e) => handleChange('defaultHaikuModel', e.target.value)}
                placeholder="claude-3-haiku-20240307"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claude-sonnet" className="text-xs text-muted-foreground">
                {t('providers.sonnetModel')}
              </Label>
              <Input
                id="claude-sonnet"
                value={config.defaultSonnetModel}
                onChange={(e) => handleChange('defaultSonnetModel', e.target.value)}
                placeholder="claude-3-sonnet-20240229"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claude-opus" className="text-xs text-muted-foreground">
                {t('providers.opusModel')}
              </Label>
              <Input
                id="claude-opus"
                value={config.defaultOpusModel}
                onChange={(e) => handleChange('defaultOpusModel', e.target.value)}
                placeholder="claude-3-opus-20240229"
                className="text-xs h-8"
              />
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const advancedTab = {
    id: 'advanced',
    label: t('providers.sections.advanced'),
    icon: SlidersHorizontal,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="claude-max-tokens" className="text-sm font-medium">
              {t('providers.maxTokens')}
            </Label>
            <Input
              id="claude-max-tokens"
              type="number"
              value={config.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value) || 4096)}
              min={1}
              max={200000}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claude-temperature" className="text-sm font-medium">
              {t('providers.temperature')}
            </Label>
            <Input
              id="claude-temperature"
              type="number"
              value={config.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
              min={0}
              max={2}
              step={0.1}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claude-top-p" className="text-sm font-medium">
              {t('providers.topP')}
            </Label>
            <Input
              id="claude-top-p"
              type="number"
              value={config.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value) || 1)}
              min={0}
              max={1}
              step={0.1}
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-top-k" className="text-sm font-medium">
            {t('providers.topK')}
          </Label>
          <Input
            id="claude-top-k"
            type="number"
            value={config.topK}
            onChange={(e) => handleChange('topK', parseInt(e.target.value) || 0)}
            min={0}
            max={500}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">{t('providers.topKDescription')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-system-prompt" className="text-sm font-medium">
            {t('providers.systemPrompt')}
          </Label>
          <textarea
            id="claude-system-prompt"
            value={config.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            placeholder={t('providers.systemPromptPlaceholder')}
            className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
          <p className="text-xs text-muted-foreground">{t('providers.systemPromptDescription')}</p>
        </div>
      </div>
    ),
  };

  return (
    <ProviderFormLayout tabs={[authTab, endpointTab, modelsTab, advancedTab]} defaultTab="auth" />
  );
}
