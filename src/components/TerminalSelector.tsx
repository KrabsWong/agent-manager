/**
 * Terminal Selector Component
 *
 * Allows users to select their preferred terminal application
 */

import { useTranslation } from 'react-i18next';
import { Monitor, Cpu, Zap, Terminal as TerminalIcon } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface TerminalOption {
  value: 'auto' | 'ghostty' | 'kitty' | 'terminal';
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function TerminalSelector() {
  const { t } = useTranslation();
  const { preferredTerminal, updateSettings } = useSettingsStore();
  const { toast } = useToast();

  const terminalOptions: TerminalOption[] = [
    {
      value: 'auto',
      label: t('settings.terminalAuto', 'Auto-detect'),
      description: t('settings.terminalAutoDesc', 'Automatically select best available terminal'),
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      value: 'ghostty',
      label: 'Ghostty',
      description: t('settings.terminalGhosttyDesc', 'Fast, modern terminal'),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      value: 'kitty',
      label: 'Kitty',
      description: t('settings.terminalKittyDesc', 'GPU-based terminal'),
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      value: 'terminal',
      label: t('settings.terminalDefault', 'Default Terminal'),
      description: t('settings.terminalDefaultDesc', 'macOS default terminal'),
      icon: <TerminalIcon className="h-4 w-4" />,
    },
  ];

  const handleTerminalChange = async (value: 'auto' | 'ghostty' | 'kitty' | 'terminal') => {
    try {
      await updateSettings({ preferredTerminal: value });
      toast({
        title: t('settings.terminalChanged', 'Terminal preference saved'),
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to update terminal preference:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.updateFailed', 'Failed to update settings'),
        variant: 'error',
      });
    }
  };

  return (
    <RadioGroup
      value={preferredTerminal || 'auto'}
      onValueChange={(value: 'auto' | 'ghostty' | 'kitty' | 'terminal') => handleTerminalChange(value)}
      className="space-y-3"
    >
      {terminalOptions.map((option) => (
        <Label
          key={option.value}
          htmlFor={option.value}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            preferredTerminal === option.value && 'border-primary bg-primary/5'
          )}
        >
          <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {option.icon}
              <span className="font-medium text-sm">{option.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        </Label>
      ))}
    </RadioGroup>
  );
}
