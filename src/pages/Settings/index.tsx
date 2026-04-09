import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.generalTitle')}</CardTitle>
          <CardDescription>{t('settings.generalDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LanguageSwitcher />
          <div className="border-t pt-6">
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
