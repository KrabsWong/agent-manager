import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
  ];

  const currentLanguage = i18n.language || 'zh';

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label>{t('settings.language')}</Label>
      <Select value={currentLanguage} onChange={handleLanguageChange} className="w-[180px]">
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
