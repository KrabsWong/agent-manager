import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslations = {
  nav: {
    providers: 'Providers',
    mcpServers: 'MCP Servers',
    skills: 'Skills',
    prompts: 'Prompts',
    proxy: 'Proxy',
    settings: 'Settings',
  },
  providers: {
    title: 'Providers',
    description: 'Manage AI providers for your applications',
    application: 'Application',
    loading: 'Loading providers...',
    errorLoading: 'Error loading providers',
    noProviders: 'No providers configured',
    addFirstProvider: 'Add Your First Provider',
    addProvider: 'Add Provider',
    deleteConfirm: 'Are you sure you want to delete this provider?',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    active: 'Active',
    inactive: 'Inactive',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
  apps: {
    claude: 'Claude Code',
    codex: 'Codex CLI',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode',
    openclaw: 'OpenClaw',
  },
  settings: {
    title: 'Settings',
    description: 'Configure application settings',
    language: 'Language',
    selectLanguage: 'Select language',
  },
  proxy: {
    title: 'Proxy',
    description: 'Manage proxy service for API calls',
    start: 'Start Proxy',
    stop: 'Stop Proxy',
    status: {
      running: 'Running',
      stopped: 'Stopped',
    },
    circuitBreaker: 'Circuit Breaker',
    requests: 'Requests',
    cost: 'Cost',
  },
};

// Chinese translations
const zhTranslations = {
  nav: {
    providers: '供应商',
    mcpServers: 'MCP 服务器',
    skills: '技能',
    prompts: '提示词',
    proxy: '代理',
    settings: '设置',
  },
  providers: {
    title: '供应商',
    description: '管理您的 AI 供应商',
    application: '应用程序',
    loading: '加载供应商...',
    errorLoading: '加载供应商失败',
    noProviders: '未配置供应商',
    addFirstProvider: '添加第一个供应商',
    addProvider: '添加供应商',
    deleteConfirm: '确定要删除此供应商吗？',
  },
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    active: '激活',
    inactive: '未激活',
    loading: '加载中...',
    error: '错误',
    success: '成功',
  },
  apps: {
    claude: 'Claude Code',
    codex: 'Codex CLI',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode',
    openclaw: 'OpenClaw',
  },
  settings: {
    title: '设置',
    description: '配置应用程序设置',
    language: '语言',
    selectLanguage: '选择语言',
  },
  proxy: {
    title: '代理',
    description: '管理 API 调用的代理服务',
    start: '启动代理',
    stop: '停止代理',
    status: {
      running: '运行中',
      stopped: '已停止',
    },
    circuitBreaker: '熔断器',
    requests: '请求数',
    cost: '成本',
  },
};

const resources = {
  en: { translation: enTranslations },
  zh: { translation: zhTranslations },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
