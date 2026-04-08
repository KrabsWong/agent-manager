/**
 * HelpDialog Component
 *
 * Built-in help documentation
 */

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function HelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="w-4 h-4" />
          {t('help.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
          <DialogDescription>{t('help.description')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">{t('help.gettingStarted.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('help.gettingStarted.content')}</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">{t('help.providers.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('help.providers.content')}</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">{t('help.mcp.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('help.mcp.content')}</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">{t('help.proxy.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('help.proxy.content')}</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
