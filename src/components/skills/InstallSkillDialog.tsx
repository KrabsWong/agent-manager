/**
 * Install Skill Dialog
 * 
 * Dialog for installing skills from GitHub repositories
 */

import { useState } from 'react';
import { Plus, Github, Search, Download, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useScanRepo, useRepoInfo } from '@/hooks/useSkills';

interface InstallSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (repoUrl: string, directory?: string) => void;
  isInstalling: boolean;
}

type Step = 'select-repo' | 'select-skill' | 'custom-repo';

const PRESET_REPOS = [
  { owner: 'anthropics', name: 'skills', description: 'Official Anthropic skills collection' },
  { owner: 'ComposioHQ', name: 'awesome-claude-skills', description: 'Community-contributed skills' },
];

export function InstallSkillDialog({ isOpen, onClose, onInstall, isInstalling }: InstallSkillDialogProps) {
  const [step, setStep] = useState<Step>('select-repo');
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);


  const { data: repoInfo } = useRepoInfo(
    selectedRepo?.owner || '',
    selectedRepo?.name || '',
    !!selectedRepo
  );

  const { data: availableSkills, isLoading: isScanning } = useScanRepo(
    selectedRepo?.owner || '',
    selectedRepo?.name || '',
    !!selectedRepo
  );

  if (!isOpen) return null;

  const handleSelectRepo = (owner: string, name: string) => {
    setSelectedRepo({ owner, name });
    setStep('select-skill');
  };

  const handleSelectCustom = () => {
    setStep('custom-repo');
  };

  const handleCustomRepoSubmit = () => {
    if (customRepoInput) {
      const parts = customRepoInput.replace('https://github.com/', '').split('/');
      if (parts.length >= 2) {
        setSelectedRepo({ owner: parts[0], name: parts[1] });
        setStep('select-skill');
      }
    }
  };

  const handleInstallSkill = (skillDir: string) => {
    if (selectedRepo) {
      const repoUrl = `${selectedRepo.owner}/${selectedRepo.name}`;
      onInstall(repoUrl, skillDir);
    }
  };

  const handleInstallFullRepo = () => {
    if (selectedRepo) {
      const repoUrl = `${selectedRepo.owner}/${selectedRepo.name}`;
      onInstall(repoUrl);
    }
  };

  const handleClose = () => {
    setStep('select-repo');
    setCustomRepoInput('');
    setSelectedRepo(null);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {step === 'select-repo' && 'Install Skill'}
            {step === 'custom-repo' && 'Custom Repository'}
            {step === 'select-skill' && `Skills from ${selectedRepo?.owner}/${selectedRepo?.name}`}
          </h2>

          {step === 'select-repo' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a repository to browse available skills.
              </p>

              <div className="space-y-2">
                {PRESET_REPOS.map((repo) => (
                  <button
                    key={`${repo.owner}/${repo.name}`}
                    onClick={() => handleSelectRepo(repo.owner, repo.name)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Github className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{repo.owner}/{repo.name}</span>
                        <Badge variant="secondary">Official</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    </div>
                  </button>
                ))}

                <button
                  onClick={handleSelectCustom}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-medium">Custom Repository</span>
                    <p className="text-sm text-muted-foreground">
                      Install from any GitHub repository
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'custom-repo' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url">GitHub Repository</Label>
                <div className="flex gap-2">
                  <Input
                    id="repo-url"
                    value={customRepoInput}
                    onChange={(e) => setCustomRepoInput(e.target.value)}
                    placeholder="owner/repo or https://github.com/owner/repo"
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomRepoSubmit()}
                  />
                  <Button onClick={handleCustomRepoSubmit}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the repository in format: owner/repo
                </p>
              </div>
            </div>
          )}

          {step === 'select-skill' && (
            <div className="space-y-4">
              {repoInfo && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Github className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repoInfo.owner}/{repoInfo.name}</span>
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" />
                        {repoInfo.stars}
                      </Badge>
                    </div>
                    {repoInfo.description && (
                      <p className="text-sm text-muted-foreground">{repoInfo.description}</p>
                    )}
                  </div>
                </div>
              )}

              {isScanning ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Scanning repository...</span>
                </div>
              ) : availableSkills && availableSkills.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available Skills</p>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {availableSkills.map((skill) => (
                      <div
                        key={skill.directory}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{skill.name}</span>
                          </div>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleInstallSkill(skill.directory)}
                          disabled={isInstalling}
                        >
                          {isInstalling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Install
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No individual skills found in this repository.</p>
                  <p className="text-sm">You can install the entire repository as a skill.</p>
                  <Button
                    className="mt-4"
                    onClick={handleInstallFullRepo}
                    disabled={isInstalling}
                  >
                    {isInstalling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Install Full Repository
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === 'select-skill' && (
              <Button variant="ghost" onClick={() => setStep('select-repo')}>
                Back
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
