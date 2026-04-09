/**
 * Edit MCP Server Dialog
 *
 * Dialog for editing an existing MCP server
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, Terminal, Globe, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { McpServer, CreateMcpServerInput } from '@/types';

interface EditMcpDialogProps {
  server: McpServer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, input: Partial<CreateMcpServerInput>) => void;
}

type TransportType = 'stdio' | 'http' | 'sse';

export function EditMcpDialog({ server, isOpen, onClose, onSave }: EditMcpDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<TransportType>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (server) {
      setName(server.name);
      setTransport(server.transport);
      setCommand(server.command || '');
      setArgs(server.args?.join(' ') || '');
      setUrl(server.url || '');
      setDescription(server.description || '');
    }
  }, [server]);

  if (!isOpen || !server) return null;

  const handleSubmit = () => {
    const input: Partial<CreateMcpServerInput> = {
      name: name || server.name,
      transport,
      command: transport === 'stdio' ? command : undefined,
      args: args ? args.split(' ').filter(Boolean) : undefined,
      url: transport === 'http' || transport === 'sse' ? url : undefined,
      description: description || undefined,
    };
    onSave(server.id, input);
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const getTransportIcon = (t: string) => {
    switch (t) {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center app-no-drag">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('mcp.editServer')}</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-mcp-name">{t('mcp.serverName')}</Label>
              <Input
                id="edit-mcp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('mcp.enterServerName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mcp-transport">{t('mcp.transportType')}</Label>
              <div className="flex gap-2">
                {(['stdio', 'http', 'sse'] as TransportType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTransport(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors text-sm ${
                      transport === t
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

            {transport === 'stdio' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-mcp-command">{t('mcp.command')}</Label>
                  <Input
                    id="edit-mcp-command"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder={t('mcp.commandPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mcp-args">{t('mcp.arguments')}</Label>
                  <Input
                    id="edit-mcp-args"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder={t('mcp.argsPlaceholder')}
                  />
                </div>
              </>
            )}

            {(transport === 'http' || transport === 'sse') && (
              <div className="space-y-2">
                <Label htmlFor="edit-mcp-url">{t('mcp.url')}</Label>
                <Input
                  id="edit-mcp-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('mcp.urlPlaceholder')}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-mcp-description">{t('mcp.descriptionOptional')}</Label>
              <Input
                id="edit-mcp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('mcp.descriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              <Check className="h-4 w-4 mr-2" />
              {t('mcp.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
