/**
 * MCP Servers Page
 *
 * Main page for managing MCP servers
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Zap, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { McpCard } from '@/components/mcp/McpCard';
import { AddMcpDialog } from '@/components/mcp/AddMcpDialog';
import { EditMcpDialog } from '@/components/mcp/EditMcpDialog';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<McpServer | null>(null);

  const { data: servers, isLoading, error, refetch } = useMcpServers();
  const createMcpServer = useCreateMcpServer();
  const updateMcpServer = useUpdateMcpServer();
  const deleteMcpServer = useDeleteMcpServer();
  const toggleMcpApp = useToggleMcpApp();
  const syncMcpServers = useSyncMcpServers();

  // Calculate simple stats
  const stats = useMemo(() => {
    if (!servers) return null;
    const totalServers = servers.length;
    const enabledServers = servers.filter((s) => Object.values(s.enabledApps).some(Boolean)).length;
    return { totalServers, enabledServers };
  }, [servers]);

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

  const handleDeleteClick = (server: McpServer) => {
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (serverToDelete) {
      deleteMcpServer.mutate(serverToDelete.id);
    }
    setServerToDelete(null);
  };

  const handleToggleApp = (serverId: string, appType: AppType, enabled: boolean) => {
    toggleMcpApp.mutate({ id: serverId, appType, enabled });
  };

  const handleSyncAll = () => {
    syncMcpServers.mutate();
  };

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

      {/* Simple Stats */}
      {stats && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {stats.totalServers} {t('mcp.totalServers')}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-600 font-medium">
            {stats.enabledServers} {t('mcp.activeConfigurations')}
          </span>
        </div>
      )}

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
              onDelete={() => handleDeleteClick(server)}
              onToggleApp={(appType, enabled) => handleToggleApp(server.id, appType, enabled)}
              isToggling={toggleMcpApp.isPending}
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        description={t('mcp.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  );
}
