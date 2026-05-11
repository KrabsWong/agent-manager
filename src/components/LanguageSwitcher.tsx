import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
  ];

  const currentLanguage = i18n.language || 'en';

  const handleLanguageChange = async (value: string) => {
    // Change language immediately
    await i18n.changeLanguage(value);

    // Persist to localStorage
    try {
      const currentSettings = localStorage.getItem('yes-sessions-settings');
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      const merged = { ...settings, language: value };
      localStorage.setItem('yes-sessions-settings', JSON.stringify(merged));
      console.log('[LanguageSwitcher] Language saved:', value);
    } catch (error) {
      console.error('[LanguageSwitcher] Failed to save language:', error);
    }

    toast({
      title: t('settings.languageChanged', 'Language changed'),
      description: languages.find((l) => l.code === value)?.name,
    });
  };

  return (
    <Select value={currentLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[140px] h-8 text-sm">
        <SelectValue placeholder={t('settings.selectLanguage')} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}