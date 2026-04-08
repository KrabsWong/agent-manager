import { useState } from 'react';
import { Plus, FileText, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/EmptyState';
import { PromptCard } from '@/components/prompts/PromptCard';
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
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

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

  const handleDelete = (prompt: Prompt) => {
    if (window.confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      deleteMutation.mutate({ id: prompt.id, appType: prompt.appType });
    }
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Prompts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system prompts and instructions for your AI assistants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppType)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select App" />
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
            Import
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Active Prompt Info Card */}
      {activePrompt && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-primary">
              Currently Active Prompt
            </CardTitle>
            <CardDescription className="text-lg font-semibold text-foreground">
              {activePrompt.name}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error instanceof Error ? error.message : 'Failed to load prompts'}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading prompts...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && prompts.length === 0 && !error && (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={`No Prompts for ${APP_LABELS[selectedApp]} Yet`}
          description="System prompts are like giving your AI assistant a personality and instructions. They guide how the AI responds to your coding questions and tasks."
          secondaryText="For example, you can create a prompt that makes the AI focus on clean code, or one that helps with debugging. You can also import prompts you've already set up in the app."
          action={{
            label: 'Create Your First Prompt',
            onClick: handleCreate,
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      )}

      {/* Prompts Grid */}
      {!isLoading && prompts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isActive={activePrompt?.id === prompt.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
    </div>
  );
}
