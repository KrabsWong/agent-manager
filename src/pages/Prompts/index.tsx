import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PromptListItem } from '@/components/prompts/PromptListItem';
import { PromptEditor } from '@/components/prompts/PromptEditor';
import {
  usePrompts,
  useActivePrompt,
  useCreatePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  useSetActivePrompt,
  useImportPromptFromApp,
} from '@/hooks/usePrompts';
import type { Prompt, CreatePromptInput, AppType } from '@/types';
import { APP_TYPES } from '@/types';

const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

export function PromptsPage() {
  const { t } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);

  const { data: prompts = [], isLoading, error } = usePrompts(selectedApp);
  const { data: activePrompt } = useActivePrompt(selectedApp);

  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();
  const deleteMutation = useDeletePrompt();
  const setActiveMutation = useSetActivePrompt();
  const importMutation = useImportPromptFromApp();

  const handleCreate = () => {
    setEditingPrompt(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsEditorOpen(true);
  };

  const handleDeleteClick = (prompt: Prompt) => {
    setPromptToDelete(prompt);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (promptToDelete) {
      deleteMutation.mutate({ id: promptToDelete.id, appType: promptToDelete.appType });
    }
    setPromptToDelete(null);
  };

  const handleSetActive = (prompt: Prompt) => {
    setActiveMutation.mutate({ id: prompt.id, appType: prompt.appType });
  };

  const handleSave = (data: CreatePromptInput) => {
    if (editingPrompt) {
      updateMutation.mutate({
        id: editingPrompt.id,
        appType: editingPrompt.appType,
        input: data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImport = () => {
    importMutation.mutate({ appType: selectedApp });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('prompts.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('prompts.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppType)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('prompts.selectApp')} />
            </SelectTrigger>
            <SelectContent>
              {APP_TYPES.map((app) => (
                <SelectItem key={app} value={app}>
                  {APP_LABELS[app]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleImport} disabled={importMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {t('prompts.import')}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('prompts.create')}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error instanceof Error ? error.message : t('prompts.failedToLoad')}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('prompts.loading')}</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && prompts.length === 0 && !error && (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={t('prompts.noPrompts', { app: APP_LABELS[selectedApp] })}
          description={t('prompts.noPromptsDesc')}
          secondaryText={t('prompts.noPromptsSecondary')}
        />
      )}

      {/* Prompts List */}
      {!isLoading && prompts.length > 0 && (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <PromptListItem
              key={prompt.id}
              prompt={prompt}
              isActive={activePrompt?.id === prompt.id}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      )}

      {/* Prompt Editor Dialog */}
      <PromptEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
        prompt={editingPrompt}
        appType={selectedApp}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        description={
          promptToDelete ? t('prompts.deleteConfirm', { name: promptToDelete.name }) : ''
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  );
}
