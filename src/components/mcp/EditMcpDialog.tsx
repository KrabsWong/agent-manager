/**
 * Edit MCP Server Dialog
 * 
 * Dialog for editing an existing MCP server
 */

import { useState, useEffect } from 'react';
import { Check, Terminal, Globe, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { McpServer, CreateMcpServerInput } from '@/types';

interface EditMcpDialogProps {
  server: McpServer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, input: Partial<CreateMcpServerInput>) => void;
}

type TransportType = 'stdio' | 'http' | 'sse';

export function EditMcpDialog({ server, isOpen, onClose, onSave }: EditMcpDialogProps) {
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
      url: (transport === 'http' || transport === 'sse') ? url : undefined,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Edit MCP Server</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-mcp-name">Server Name</Label>
              <Input
                id="edit-mcp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter server name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mcp-transport">Transport Type</Label>
              <div className="flex gap-2">
                {(['stdio', 'http', 'sse'] as TransportType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTransport(t)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
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
                  <Label htmlFor="edit-mcp-command">Command</Label>
                  <Input
                    id="edit-mcp-command"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="npx or uvx command"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mcp-args">Arguments (space-separated)</Label>
                  <Input
                    id="edit-mcp-args"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="-y @modelcontextprotocol/server-filesystem"
                  />
                </div>
              </>
            )}

            {(transport === 'http' || transport === 'sse') && (
              <div className="space-y-2">
                <Label htmlFor="edit-mcp-url">URL</Label>
                <Input
                  id="edit-mcp-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/mcp"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-mcp-description">Description (optional)</Label>
              <Input
                id="edit-mcp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this server do?"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Enabled Apps</h3>
              <div className="flex flex-wrap gap-2">
                {(['claude', 'codex', 'gemini', 'opencode', 'openclaw'] as const).map((app) => (
                  <Badge
                    key={app}
                    variant={server.enabledApps[app] ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {app}
                    {server.enabledApps[app] ? ' ✓' : ' ✗'}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Toggle apps from the main list view
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
