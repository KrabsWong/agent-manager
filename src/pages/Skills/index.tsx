/**
 * Skills Page
 *
 * Main page for managing and discovering skills
 */

import { useState } from 'react';
import { Plus, RefreshCw, FolderOpen, Sparkles, ExternalLink, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCard } from '@/components/skills/SkillCard';
import { InstallSkillDialog } from '@/components/skills/InstallSkillDialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useSkills,
  useInstallSkill,
  useUninstallSkill,
  useToggleSkillApp,
  useOpenSkillsFolder,
} from '@/hooks/useSkills';
import type { AppType } from '@/types';

export function SkillsPage() {
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);

  const { data: skills, isLoading, error, refetch } = useSkills();
  const installSkill = useInstallSkill();
  const uninstallSkill = useUninstallSkill();
  const toggleSkillApp = useToggleSkillApp();
  const openSkillsFolder = useOpenSkillsFolder();

  const handleInstallSkill = (repoUrl: string, directory?: string) => {
    installSkill.mutate(
      { repoUrl, directory },
      {
        onSuccess: () => {
          setIsInstallDialogOpen(false);
        },
      }
    );
  };

  const handleUninstallSkill = (id: string) => {
    if (confirm('Are you sure you want to uninstall this skill?')) {
      uninstallSkill.mutate(id);
    }
  };

  const handleToggleApp = (skillId: string, appType: AppType, enabled: boolean) => {
    toggleSkillApp.mutate({ id: skillId, appType, enabled });
  };

  const totalEnabledCount =
    skills?.reduce(
      (total, skill) => total + Object.values(skill.enabledApps).filter(Boolean).length,
      0
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-muted-foreground">
            Discover and manage AI skills for your applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => openSkillsFolder.mutate()}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Folder
          </Button>
          <Button onClick={() => setIsInstallDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Install Skill
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="https://github.com/anthropics/skills"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Official Skills</p>
            <p className="text-sm text-muted-foreground">
              Browse Anthropic's official skill collection
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
        <a
          href="https://github.com/ComposioHQ/awesome-claude-skills"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Community Skills</p>
            <p className="text-sm text-muted-foreground">Explore community-contributed skills</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{skills?.length || 0}</div>
          <div className="text-sm text-muted-foreground">Installed Skills</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{totalEnabledCount}</div>
          <div className="text-sm text-muted-foreground">Active Configurations</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">
            {skills?.filter((s) => Object.values(s.enabledApps).some(Boolean)).length || 0}
          </div>
          <div className="text-sm text-muted-foreground">Enabled Skills</div>
        </div>
      </div>

      {/* Skills List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading skills...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Error loading skills: {error.message}</div>
        </div>
      ) : skills?.length === 0 ? (
        <EmptyState
          icon={<Wand2 className="h-8 w-8" />}
          title="No Skills Installed Yet"
          description="Skills are ready-to-use AI capabilities that extend what your assistant can do. They're like apps for your AI - from code review to documentation generation."
          secondaryText="Browse our skill marketplace to find tools that match your workflow. Popular options include code review assistants, commit message generators, and documentation writers."
          action={{
            label: 'Install Your First Skill',
            onClick: () => setIsInstallDialogOpen(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {skills?.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onDelete={() => handleUninstallSkill(skill.id)}
              onToggleApp={(appType, enabled) => handleToggleApp(skill.id, appType, enabled)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <InstallSkillDialog
        isOpen={isInstallDialogOpen}
        onClose={() => setIsInstallDialogOpen(false)}
        onInstall={handleInstallSkill}
        isInstalling={installSkill.isPending}
      />
    </div>
  );
}
