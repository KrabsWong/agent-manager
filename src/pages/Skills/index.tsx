/**
 * Skills Page
 *
 * Main page for managing and discovering skills
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, FolderPlus, Wand2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCard } from '@/components/skills/SkillCard';
import { InstallSkillDialog } from '@/components/skills/InstallSkillDialog';
import { AddLocalSkillDialog } from '@/components/skills/AddLocalSkillDialog';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useSkills,
  useInstallSkill,
  useInstallLocalSkill,
  useUninstallSkill,
  useToggleSkillApp,
} from '@/hooks/useSkills';
import { api } from '@/lib/api';
import type { AppType, Skill } from '@/types';

export function SkillsPage() {
  const { t } = useTranslation();
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [isLocalDialogOpen, setIsLocalDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

  const { data: skills, isLoading, error, refetch } = useSkills();
  const installSkill = useInstallSkill();
  const installLocalSkill = useInstallLocalSkill();
  const uninstallSkill = useUninstallSkill();
  const toggleSkillApp = useToggleSkillApp();

  // Calculate simple stats
  const stats = useMemo(() => {
    if (!skills) return null;
    const totalSkills = skills.length;
    const enabledSkills = skills.filter((s) => Object.values(s.enabledApps).some(Boolean)).length;
    return { totalSkills, enabledSkills };
  }, [skills]);

  const handleOpenExternal = async (url: string) => {
    await api.shell.openExternal(url);
  };

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

  const handleDeleteClick = (skill: Skill) => {
    setSkillToDelete(skill);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (skillToDelete) {
      uninstallSkill.mutate(skillToDelete.id);
    }
    setSkillToDelete(null);
  };

  const handleToggleApp = (skillId: string, appType: AppType, enabled: boolean) => {
    toggleSkillApp.mutate({ id: skillId, appType, enabled });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('skills.title')}</h1>
          <p className="text-muted-foreground">
            {t('skills.description')}{' '}
            <button
              onClick={() => handleOpenExternal('https://github.com/anthropics/skills')}
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              {t('skills.officialSkills')}
              <ExternalLink className="h-3 w-3" />
            </button>
            {' · '}
            <button
              onClick={() =>
                handleOpenExternal('https://github.com/ComposioHQ/awesome-claude-skills')
              }
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              {t('skills.communitySkills')}
              <ExternalLink className="h-3 w-3" />
            </button>
          </p>
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

      {/* Simple Stats */}
      {stats && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {stats.totalSkills} {t('skills.installedSkills')}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-600 font-medium">
            {stats.enabledSkills} {t('skills.activeSkills')}
          </span>
        </div>
      )}

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
              onDelete={() => handleDeleteClick(skill)}
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        description={t('skills.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  );
}
