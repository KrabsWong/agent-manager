/**
 * Add MCP Server Dialog
 *
 * Dialog for adding a new MCP server (preset or custom)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check, Terminal, Globe, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MCP_PRESETS, MCP_CATEGORIES } from '@/config/mcpPresets';
import type { CreateMcpServerInput } from '@/types';

interface AddMcpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: CreateMcpServerInput) => void;
}

type Step = 'select' | 'configure';
type TransportType = 'stdio' | 'http' | 'sse';

export function AddMcpDialog({ isOpen, onClose, onAdd }: AddMcpDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('select');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');

  // Custom form state
  const [customName, setCustomName] = useState('');
  const [customTransport, setCustomTransport] = useState<TransportType>('stdio');
  const [customCommand, setCustomCommand] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  if (!isOpen) return null;

  const filteredPresets =
    activeCategory === 'all'
      ? MCP_PRESETS
      : MCP_PRESETS.filter((p) => p.category === activeCategory);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
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
      const input: CreateMcpServerInput = {
        name: customName || 'Custom MCP Server',
        transport: customTransport,
        command: customTransport === 'stdio' ? customCommand : undefined,
        args: customArgs ? customArgs.split(' ').filter(Boolean) : undefined,
        url: customTransport === 'http' || customTransport === 'sse' ? customUrl : undefined,
        description: customDescription || undefined,
      };
      onAdd(input);
    } else if (selectedPreset) {
      const preset = MCP_PRESETS.find((p) => p.id === selectedPreset);
      if (preset) {
        onAdd({ ...preset.config });
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedPreset(null);
    setIsCustom(false);
    setActiveCategory('all');
    setCustomName('');
    setCustomTransport('stdio');
    setCustomCommand('');
    setCustomArgs('');
    setCustomUrl('');
    setCustomDescription('');
    onClose();
  };

  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case 'stdio':
        return <Terminal className="h-4 w-4" />;
      case 'http':
        return <Globe className="h-4 w-4" />;
      case 'sse':
        return <Radio className="h-4 w-4" />;
      default:
        return <Terminal className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {step === 'select' ? t('mcp.addDialogTitle') : t('mcp.configureDialogTitle')}
          </h2>

          {step === 'select' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('mcp.selectOrCustom')}</p>

              {/* Category filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent'
                  }`}
                >
                  {t('mcp.all')}
                </button>
                {MCP_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    {t(`mcp.categories.${cat.toLowerCase()}`)}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary text-secondary-foreground shrink-0">
                      {getTransportIcon(preset.config.transport)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{preset.name}</span>
                        <Badge variant="outline">
                          {t(`mcp.categories.${preset.category.toLowerCase()}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{preset.description}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {preset.config.command} {preset.config.args?.slice(0, 3).join(' ')}
                        {preset.config.args && preset.config.args.length > 3 ? ' ...' : ''}
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
                    <span className="font-medium">{t('mcp.customServer')}</span>
                    <p className="text-sm text-muted-foreground">{t('mcp.customServerDesc')}</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isCustom ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-name">{t('mcp.serverName')}</Label>
                    <Input
                      id="mcp-name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t('mcp.enterServerName')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mcp-transport">{t('mcp.transportType')}</Label>
                    <div className="flex gap-2">
                      {(['stdio', 'http', 'sse'] as TransportType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setCustomTransport(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors text-sm ${
                            customTransport === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-accent'
                          }`}
                        >
                          {getTransportIcon(t)}
                          <span className="uppercase">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {customTransport === 'stdio' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="mcp-command">{t('mcp.command')}</Label>
                        <Input
                          id="mcp-command"
                          value={customCommand}
                          onChange={(e) => setCustomCommand(e.target.value)}
                          placeholder={t('mcp.commandPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mcp-args">{t('mcp.arguments')}</Label>
                        <Input
                          id="mcp-args"
                          value={customArgs}
                          onChange={(e) => setCustomArgs(e.target.value)}
                          placeholder={t('mcp.argsPlaceholder')}
                        />
                      </div>
                    </>
                  )}

                  {(customTransport === 'http' || customTransport === 'sse') && (
                    <div className="space-y-2">
                      <Label htmlFor="mcp-url">{t('mcp.url')}</Label>
                      <Input
                        id="mcp-url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder={t('mcp.urlPlaceholder')}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="mcp-description">{t('mcp.descriptionOptional')}</Label>
                    <Input
                      id="mcp-description"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder={t('mcp.descriptionPlaceholder')}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {selectedPreset && (
                    <>
                      <div className="w-10 h-10 rounded flex items-center justify-center bg-secondary">
                        {getTransportIcon(
                          MCP_PRESETS.find((p) => p.id === selectedPreset)?.config.transport ||
                            'stdio'
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {MCP_PRESETS.find((p) => p.id === selectedPreset)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {MCP_PRESETS.find((p) => p.id === selectedPreset)?.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">{t('mcp.enableAfterAdding')}</p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            {step === 'configure' && (
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                {t('mcp.addServer')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
