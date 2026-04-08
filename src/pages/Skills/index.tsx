/**
 * Skills Page
 *
 * Main page for managing and discovering skills
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, FolderPlus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCard } from '@/components/skills/SkillCard';
import { InstallSkillDialog } from '@/components/skills/InstallSkillDialog';
import { AddLocalSkillDialog } from '@/components/skills/AddLocalSkillDialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useSkills,
  useInstallSkill,
  useInstallLocalSkill,
  useUninstallSkill,
  useToggleSkillApp,
} from '@/hooks/useSkills';
import type { AppType } from '@/types';

export function SkillsPage() {
  const { t } = useTranslation();
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [isLocalDialogOpen, setIsLocalDialogOpen] = useState(false);

  const { data: skills, isLoading, error, refetch } = useSkills();
  const installSkill = useInstallSkill();
  const installLocalSkill = useInstallLocalSkill();
  const uninstallSkill = useUninstallSkill();
  const toggleSkillApp = useToggleSkillApp();

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

  const handleInstallLocalSkill = (localPath: string, skillName: string) => {
    installLocalSkill.mutate(
      { localPath, skillName },
      {
        onSuccess: () => {
          setIsLocalDialogOpen(false);
        },
      }
    );
  };

  const handleUninstallSkill = (id: string) => {
    if (uninstallSkill.isPending) return; // Prevent double submission
    if (confirm(t('skills.deleteConfirm'))) {
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
          <h1 className="text-2xl font-bold">{t('skills.title')}</h1>
          <p className="text-muted-foreground">{t('skills.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setIsLocalDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            {t('skills.addLocal')}
          </Button>
          <Button onClick={() => setIsInstallDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('skills.installSkill')}
          </Button>
        </div>
      </div>

      {/* Quick Links - Simple text links */}
      <div className="flex items-center gap-4 text-sm">
        <a
          href="https://github.com/anthropics/skills"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {t('skills.officialSkills')}
        </a>
        <a
          href="https://github.com/ComposioHQ/awesome-claude-skills"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {t('skills.communitySkills')}
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{skills?.length || 0}</div>
          <div className="text-sm text-muted-foreground">{t('skills.installedSkills')}</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{totalEnabledCount}</div>
          <div className="text-sm text-muted-foreground">{t('skills.activeConfigs')}</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">
            {skills?.filter((s) => Object.values(s.enabledApps).some(Boolean)).length || 0}
          </div>
          <div className="text-sm text-muted-foreground">{t('skills.enabledSkills')}</div>
        </div>
      </div>

      {/* Skills List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('skills.loading')}</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">
            {t('skills.errorLoading')}: {error.message}
          </div>
        </div>
      ) : skills?.length === 0 ? (
        <EmptyState
          icon={<Wand2 className="h-8 w-8" />}
          title={t('skills.noSkills')}
          description={t('skills.noSkillsDesc')}
          secondaryText={t('skills.noSkillsSecondary')}
        />
      ) : (
        <div className="grid gap-4">
          {skills?.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onDelete={() => handleUninstallSkill(skill.id)}
              onToggleApp={(appType, enabled) => handleToggleApp(skill.id, appType, enabled)}
              isToggling={toggleSkillApp.isPending}
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

      <AddLocalSkillDialog
        isOpen={isLocalDialogOpen}
        onClose={() => setIsLocalDialogOpen(false)}
        onAdd={handleInstallLocalSkill}
        isAdding={installLocalSkill.isPending}
      />
    </div>
  );
}
