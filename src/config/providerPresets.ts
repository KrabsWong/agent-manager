/**
 * Provider Presets
 * 
 * Pre-configured provider templates for popular AI services
 */

import type { ProviderCategory, CreateProviderInput } from '@/types';

export interface ProviderPreset {
  name: string;
  category: ProviderCategory;
  websiteUrl: string;
  apiKeyUrl?: string;
  icon?: string;
  iconColor?: string;
  settingsConfig: Record<string, unknown>;
  description?: string;
}

// Claude Official
export const claudeOfficialPreset: ProviderPreset = {
  name: 'Claude Official',
  category: 'official',
  websiteUrl: 'https://www.anthropic.com/claude-code',
  apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  icon: 'claude',
  iconColor: '#D97757',
  description: 'Official Anthropic Claude API',
  settingsConfig: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-opus-20240229',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// OpenAI
export const openAIPreset: ProviderPreset = {
  name: 'OpenAI',
  category: 'official',
  websiteUrl: 'https://openai.com',
  apiKeyUrl: 'https://platform.openai.com/api-keys',
  icon: 'openai',
  iconColor: '#10A37F',
  description: 'OpenAI GPT models',
  settingsConfig: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// DeepSeek (CN Official)
export const deepSeekPreset: ProviderPreset = {
  name: 'DeepSeek',
  category: 'cn_official',
  websiteUrl: 'https://platform.deepseek.com',
  apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  icon: 'deepseek',
  iconColor: '#4F46E5',
  description: 'DeepSeek AI (China)',
  settingsConfig: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// OpenRouter (Aggregator)
export const openRouterPreset: ProviderPreset = {
  name: 'OpenRouter',
  category: 'aggregator',
  websiteUrl: 'https://openrouter.ai',
  apiKeyUrl: 'https://openrouter.ai/keys',
  icon: 'openrouter',
  iconColor: '#7C3AED',
  description: 'Unified API for multiple models',
  settingsConfig: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3-opus',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// SiliconFlow (Aggregator)
export const siliconFlowPreset: ProviderPreset = {
  name: 'SiliconFlow',
  category: 'aggregator',
  websiteUrl: 'https://siliconflow.cn',
  apiKeyUrl: 'https://siliconflow.cn',
  icon: 'siliconflow',
  iconColor: '#0EA5E9',
  description: 'SiliconFlow Model API',
  settingsConfig: {
    apiKey: '',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V2-Chat',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// Azure OpenAI (Cloud Provider)
export const azureOpenAIPreset: ProviderPreset = {
  name: 'Azure OpenAI',
  category: 'cloud_provider',
  websiteUrl: 'https://azure.microsoft.com/services/cognitive-services/openai-service',
  apiKeyUrl: 'https://portal.azure.com',
  icon: 'azure',
  iconColor: '#0078D4',
  description: 'Microsoft Azure OpenAI Service',
  settingsConfig: {
    apiKey: '',
    baseUrl: '', // User needs to provide their endpoint
    model: 'gpt-4',
    maxTokens: 4096,
    temperature: 0.7,
    apiVersion: '2024-02-01',
  },
};

// AWS Bedrock (Cloud Provider)
export const awsBedrockPreset: ProviderPreset = {
  name: 'AWS Bedrock',
  category: 'cloud_provider',
  websiteUrl: 'https://aws.amazon.com/bedrock',
  apiKeyUrl: 'https://aws.amazon.com/console',
  icon: 'aws',
  iconColor: '#FF9900',
  description: 'Amazon Web Services Bedrock',
  settingsConfig: {
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    model: 'anthropic.claude-3-opus-20240229-v1:0',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// Google Gemini
export const geminiPreset: ProviderPreset = {
  name: 'Google Gemini',
  category: 'official',
  websiteUrl: 'https://ai.google.dev',
  apiKeyUrl: 'https://makersuite.google.com/app/apikey',
  icon: 'gemini',
  iconColor: '#4285F4',
  description: 'Google Gemini API',
  settingsConfig: {
    apiKey: '',
    model: 'gemini-1.5-pro-latest',
    maxTokens: 8192,
    temperature: 0.7,
  },
};

// All presets
export const providerPresets: ProviderPreset[] = [
  claudeOfficialPreset,
  geminiPreset,
  openAIPreset,
  deepSeekPreset,
  openRouterPreset,
  siliconFlowPreset,
  azureOpenAIPreset,
  awsBedrockPreset,
];

// Get preset by name
export function getProviderPreset(name: string): ProviderPreset | undefined {
  return providerPresets.find((p) => p.name === name);
}

// Convert preset to CreateProviderInput
export function presetToCreateInput(
  preset: ProviderPreset,
  appType: import('@/types').AppType
): CreateProviderInput {
  return {
    appType,
    name: preset.name,
    category: preset.category,
    websiteUrl: preset.websiteUrl,
    settingsConfig: { ...preset.settingsConfig },
    icon: preset.icon,
    iconColor: preset.iconColor,
  };
}
