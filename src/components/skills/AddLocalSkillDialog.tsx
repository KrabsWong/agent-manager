/**
 * Add Local Skill Dialog
 *
 * Dialog for adding skills from local folders
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, Plus, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { skillsApi } from '@/lib/api';

interface AddLocalSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (path: string, name: string) => void;
  isAdding: boolean;
}

export function AddLocalSkillDialog({
  isOpen,
  onClose,
  onAdd,
  isAdding,
}: AddLocalSkillDialogProps) {
  const { t } = useTranslation();
  const [skillPath, setSkillPath] = useState('');
  const [skillName, setSkillName] = useState('');
  const [error, setError] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    try {
      const selectedPath = await skillsApi.selectFolder();
      if (selectedPath) {
        setSkillPath(selectedPath);
        // Auto-fill name from folder name if empty
        if (!skillName) {
          const folderName = selectedPath.split('/').pop() || selectedPath.split('\\').pop();
          if (folderName) {
            setSkillName(folderName);
          }
        }
      }
    } catch (err) {
      setError(t('skills.localSkill.selectError') || 'Failed to select folder');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!skillPath.trim()) {
      setError(t('skills.localSkill.pathRequired') || 'Please enter the skill folder path');
      return;
    }

    if (!skillName.trim()) {
      setError(t('skills.localSkill.nameRequired') || 'Please enter a name for the skill');
      return;
    }

    onAdd(skillPath.trim(), skillName.trim());
  };

  const handleClose = () => {
    setSkillPath('');
    setSkillName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {t('skills.localSkill.title') || 'Add Local Skill'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-path">
                {t('skills.localSkill.pathLabel') || 'Skill Folder Path'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="skill-path"
                  value={skillPath}
                  onChange={(e) => setSkillPath(e.target.value)}
                  placeholder="/path/to/your/skill-folder"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSelectFolder}
                  disabled={isSelecting}
                  type="button"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t('skills.localSkill.selectFolder') || 'Browse...'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('skills.localSkill.pathHint') ||
                  'Enter the full path to the skill folder on your computer'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-name">
                {t('skills.localSkill.nameLabel') || 'Skill Name'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="skill-name"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="My Custom Skill"
              />
              <p className="text-xs text-muted-foreground">
                {t('skills.localSkill.nameHint') || 'Give your skill a descriptive name'}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">
                {t('skills.localSkill.whatIsTitle') || 'What is a local skill?'}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('skills.localSkill.whatIsDesc') ||
                  "A local skill is a folder containing skill files (like skill.json, README.md, or code files) that you have on your computer. The skill folder will be copied to the application's skill directory."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isAdding}>
              {isAdding ? (
                <>{t('skills.localSkill.adding') || 'Adding...'}</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('skills.localSkill.addButton') || 'Add Skill'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
