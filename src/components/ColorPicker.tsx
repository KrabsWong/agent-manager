import { useTranslation } from 'react-i18next';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accentColors, type AccentColor, getColorById } from '@/lib/theme/colors';
import { useTheme } from '@/components/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ColorPickerProps {
  value: AccentColor;
  onChange: (color: AccentColor) => void;
}

// 获取颜色预览样式
function getColorPreviewStyle(colorId: AccentColor, isDark: boolean): React.CSSProperties {
  if (colorId === 'default') {
    return {
      background: isDark
        ? 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #475569 100%)'
        : 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #64748b 100%)',
    };
  }
  return { backgroundColor: getColorById(colorId).base };
}

// 检查是否使用深色勾选标记
function useDarkCheck(colorId: AccentColor): boolean {
  return colorId === 'default' || ['yellow', 'lime'].includes(colorId);
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const currentColor = getColorById(value);

  return (
    <Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {t('settings.accentColor') || 'Accent Color'}
            <span className="text-muted-foreground font-normal">
              {' · '}
              {t(`settings.colors.${value}`) || currentColor.name}
            </span>
          </div>
          <div
            className="w-4 h-4 rounded-full border border-border/60 shrink-0"
            style={getColorPreviewStyle(value, isDark)}
          />
        </div>
        <DialogTrigger asChild>
          <button className="flex items-center justify-center w-8 h-8 rounded-md border border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-colors shrink-0">
            <Palette className="h-4 w-4 text-muted-foreground" />
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.selectAccentColor') || 'Select Accent Color'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-3 py-4">
          {accentColors.map((color) => {
            const isSelected = String(value) === String(color.id);
            return (
              <button
                key={color.id}
                onClick={() => onChange(color.id)}
                data-selected={isSelected}
                className={cn(
                  'group relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all',
                  'hover:bg-accent',
                  isSelected && 'bg-primary/10'
                )}
                title={t(`settings.colors.${color.id}`) || color.name}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all',
                    'group-hover:scale-110 group-hover:shadow-md',
                    isSelected ? 'border-primary scale-110 shadow-md' : 'border-border'
                  )}
                  style={getColorPreviewStyle(color.id, isDark)}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check
                        className={cn(
                          'h-5 w-5',
                          useDarkCheck(color.id) ? 'text-black' : 'text-white'
                        )}
                        style={{
                          filter: useDarkCheck(color.id)
                            ? 'none'
                            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                        }}
                      />
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-center truncate w-full',
                    isSelected ? 'font-medium text-primary' : 'text-muted-foreground'
                  )}
                >
                  {t(`settings.colors.${color.id}`) || color.name}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
