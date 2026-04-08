/**
 * MCP Servers Page
 *
 * Main page for managing MCP servers
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Zap, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { McpCard } from '@/components/mcp/McpCard';
import { AddMcpDialog } from '@/components/mcp/AddMcpDialog';
import { EditMcpDialog } from '@/components/mcp/EditMcpDialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useMcpServers,
  useCreateMcpServer,
  useUpdateMcpServer,
  useDeleteMcpServer,
  useToggleMcpApp,
  useSyncMcpServers,
} from '@/hooks/useMcp';
import type { McpServer, AppType, CreateMcpServerInput } from '@/types';

export function McpPage() {
  const { t } = useTranslation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);

  const { data: servers, isLoading, error, refetch } = useMcpServers();
  const createMcpServer = useCreateMcpServer();
  const updateMcpServer = useUpdateMcpServer();
  const deleteMcpServer = useDeleteMcpServer();
  const toggleMcpApp = useToggleMcpApp();
  const syncMcpServers = useSyncMcpServers();

  const handleAddServer = (input: CreateMcpServerInput) => {
    createMcpServer.mutate(input, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
      },
    });
  };

  const handleEditServer = (server: McpServer) => {
    setEditingServer(server);
  };

  const handleSaveEdit = (id: string, input: Partial<CreateMcpServerInput>) => {
    updateMcpServer.mutate(
      { id, input },
      {
        onSuccess: () => {
          setEditingServer(null);
        },
      }
    );
  };

  const handleDeleteServer = (id: string) => {
    if (confirm(t('mcp.deleteConfirm'))) {
      deleteMcpServer.mutate(id);
    }
  };

  const handleToggleApp = (serverId: string, appType: AppType, enabled: boolean) => {
    toggleMcpApp.mutate({ id: serverId, appType, enabled });
  };

  const handleSyncAll = () => {
    syncMcpServers.mutate();
  };

  const totalEnabledCount =
    servers?.reduce(
      (total, server) => total + Object.values(server.enabledApps).filter(Boolean).length,
      0
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('mcp.title')}</h1>
          <p className="text-muted-foreground">{t('mcp.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleSyncAll}>
            <Zap className="h-4 w-4 mr-2" />
            {t('mcp.syncAll')}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('mcp.addServer')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{servers?.length || 0}</div>
          <div className="text-sm text-muted-foreground">{t('mcp.totalServers')}</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{totalEnabledCount}</div>
          <div className="text-sm text-muted-foreground">{t('mcp.activeConfigurations')}</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">
            {servers?.filter((s) => Object.values(s.enabledApps).some(Boolean)).length || 0}
          </div>
          <div className="text-sm text-muted-foreground">{t('mcp.enabledServers')}</div>
        </div>
      </div>

      {/* Servers List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('mcp.loading')}</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">
            {t('mcp.errorLoading')}: {error.message}
          </div>
        </div>
      ) : servers?.length === 0 ? (
        <EmptyState
          icon={<Puzzle className="h-8 w-8" />}
          title={t('mcp.noServers')}
          description={t('mcp.noServersDesc')}
          secondaryText={t('mcp.noServersSecondary')}
        />
      ) : (
        <div className="grid gap-4">
          {servers?.map((server) => (
            <McpCard
              key={server.id}
              server={server}
              onEdit={() => handleEditServer(server)}
              onDelete={() => handleDeleteServer(server.id)}
              onToggleApp={(appType, enabled) => handleToggleApp(server.id, appType, enabled)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddMcpDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddServer}
      />

      <EditMcpDialog
        server={editingServer}
        isOpen={!!editingServer}
        onClose={() => setEditingServer(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
