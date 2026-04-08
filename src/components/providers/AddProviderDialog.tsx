/**
 * Add Provider Dialog
 *
 * Dialog for adding a new provider (preset or custom)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { providerPresets, presetToCreateInput } from '@/config/providerPresets';
import type { AppType, CreateProviderInput } from '@/types';

interface AddProviderDialogProps {
  appType: AppType;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: CreateProviderInput) => void;
}

export function AddProviderDialog({ appType, isOpen, onClose, onAdd }: AddProviderDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    setIsCustom(false);
    setStep('configure');
  };

  const handleSelectCustom = () => {
    setSelectedPreset(null);
    setIsCustom(true);
    setStep('configure');
  };

  const handleSubmit = () => {
    if (isCustom) {
      onAdd({
        appType,
        name: customName || t('providers.customProvider'),
        settingsConfig: {},
        category: 'custom',
      });
    } else if (selectedPreset) {
      const preset = providerPresets.find((p) => p.name === selectedPreset);
      if (preset) {
        const input = presetToCreateInput(preset, appType);
        onAdd(input);
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedPreset(null);
    setCustomName('');
    setIsCustom(false);
    onClose();
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      official: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      cn_official: 'bg-red-500/10 text-red-500 border-red-500/20',
      aggregator: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      cloud_provider: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return colors[category || 'custom'];
  };

  const getCategoryTranslationKey = (category?: string): string => {
    const mapping: Record<string, string> = {
      official: 'official',
      cn_official: 'cnOfficial',
      aggregator: 'aggregator',
      third_party: 'thirdParty',
      cloud_provider: 'cloud',
      custom: 'custom',
    };
    return mapping[category || 'custom'] || category || 'custom';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {step === 'select' ? t('providers.addProvider') : t('providers.configureProvider')}
          </h2>

          {step === 'select' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('providers.selectPresetOrCustom')}</p>

              <div className="space-y-2">
                {providerPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset.name)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: preset.iconColor }}
                    >
                      {preset.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {t(`providers.presets.${preset.name}.name`, {
                            defaultValue: preset.name,
                          })}
                        </span>
                        <Badge variant="outline" className={getCategoryColor(preset.category)}>
                          {t(`providers.categories.${getCategoryTranslationKey(preset.category)}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {t(`providers.presets.${preset.name}.description`, {
                          defaultValue: preset.description,
                        })}
                      </p>
                    </div>
                  </button>
                ))}

                <button
                  onClick={handleSelectCustom}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed hover:bg-accent transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary text-secondary-foreground shrink-0">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-medium">{t('providers.customProvider')}</span>
                    <p className="text-sm text-muted-foreground">
                      {t('providers.configureCustom')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isCustom ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-name">{t('providers.providerName')}</Label>
                  <Input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={t('providers.enterProviderName')}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {selectedPreset && (
                    <>
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: providerPresets.find((p) => p.name === selectedPreset)
                            ?.iconColor,
                        }}
                      >
                        {selectedPreset.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedPreset &&
                            t(`providers.presets.${selectedPreset}.name`, {
                              defaultValue: selectedPreset,
                            })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPreset &&
                            t(`providers.presets.${selectedPreset}.description`, {
                              defaultValue: providerPresets.find((p) => p.name === selectedPreset)
                                ?.description,
                            })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('providers.targetApplication')}</Label>
                <Select value={appType} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={appType}>{t(`common.apps.${appType}`)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">{t('providers.configureAfterAdding')}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              {t('common.buttons.cancel')}
            </Button>
            {step === 'configure' && (
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                {t('common.buttons.create')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
