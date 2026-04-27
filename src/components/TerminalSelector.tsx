import { useTranslation } from 'react-i18next';
import { Terminal, Ghost, Cat, Monitor } from 'lucide-react';
import { useTerminalInfo } from '@/hooks/useSessions';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { AppSettings } from '@/types';

type TerminalOption = {
  id: AppSettings['preferredTerminal'];
  label: string;
  icon: React.ReactNode;
  description: string;
  alwaysAvailable?: boolean;
};

export function TerminalSelector() {
  const { t } = useTranslation();
  const { data: terminalInfo } = useTerminalInfo();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const allOptions: TerminalOption[] = [
    {
      id: 'auto',
      label: t('settings.terminalAuto', 'Auto-detect'),
      icon: <Terminal className="h-4 w-4" />,
      description: t('settings.terminalAutoDesc', 'Automatically select best available terminal'),
      alwaysAvailable: true,
    },
    {
      id: 'builtin',
      label: t('settings.terminalBuiltin', 'Built-in Terminal'),
      icon: <Monitor className="h-4 w-4" />,
      description: t('settings.terminalBuiltinDesc', 'Integrated terminal in the app window'),
      alwaysAvailable: true,
    },
    {
      id: 'ghostty',
      label: 'Ghostty',
      icon: <Ghost className="h-4 w-4" />,
      description: t('settings.terminalGhosttyDesc', 'Fast, modern terminal'),
    },
    {
      id: 'kitty',
      label: 'Kitty',
      icon: <Cat className="h-4 w-4" />,
      description: t('settings.terminalKittyDesc', 'GPU-based terminal'),
    },
    {
      id: 'terminal',
      label: 'Terminal.app',
      icon: <Terminal className="h-4 w-4" />,
      description: t('settings.terminalDefaultDesc', 'macOS default terminal'),
      alwaysAvailable: true,
    },
  ];

  // Filter to only show available options
  const availableOptions: TerminalOption[] = allOptions.filter((option) => {
    if (option.alwaysAvailable) return true;
    if (option.id === 'ghostty') return terminalInfo?.ghosttyInstalled;
    if (option.id === 'kitty') return terminalInfo?.kittyInstalled;
    return true;
  });

  const handleSelect = (terminalId: AppSettings['preferredTerminal']) => {
    updateSettings({ preferredTerminal: terminalId });
    const option = availableOptions.find((opt) => opt.id === terminalId);
    toast({
      title: t('settings.terminalChanged', 'Terminal preference saved'),
      description: option?.label,
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {availableOptions.map((option) => {
          const isSelected = settings?.preferredTerminal === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-md border transition-all text-left',
                isSelected
                  ? 'border-primary-border bg-primary-muted'
                  : 'border-border/60 hover:border-primary-border hover:bg-primary-muted'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {option.description}
                </div>
              </div>
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 transition-colors shrink-0',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}
              >
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
