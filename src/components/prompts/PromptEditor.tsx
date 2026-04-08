import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Edit3, Save, X, FileText } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { Prompt, CreatePromptInput, AppType } from '@/types';

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePromptInput) => void;
  prompt?: Prompt | null;
  appType: AppType;
}

export function PromptEditor({ isOpen, onClose, onSave, prompt, appType }: PromptEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (prompt) {
        setName(prompt.name);
        setDescription(prompt.description || '');
        setContent(prompt.content);
      } else {
        setName('');
        setDescription('');
        setContent('');
      }
      setErrors({});
    }
  }, [isOpen, prompt]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('prompts.nameRequired');
    }

    if (!content.trim()) {
      newErrors.content = t('prompts.contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      content: content.trim(),
      appType,
    });

    onClose();
  };

  const isEditing = !!prompt;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? t('prompts.editPrompt') : t('prompts.createPrompt')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('prompts.editDescription') : t('prompts.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">
                {t('prompts.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prompt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('prompts.enterName')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-description">{t('prompts.descriptionLabel')}</Label>
              <Input
                id="prompt-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('prompts.enterDescription')}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('prompts.contentLabel')} <span className="text-destructive">*</span>
              </Label>
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="edit" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    {t('prompts.editTab')}
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('prompts.previewTab')}
                  </TabsTrigger>
                  <TabsTrigger value="split" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    <Eye className="h-4 w-4" />
                    {t('prompts.splitTab')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="mt-2">
                  <div className="border rounded-md overflow-hidden" style={{ height: '350px' }}>
                    <MDEditor
                      value={content}
                      onChange={(val) => setContent(val || '')}
                      height="100%"
                      visibleDragbar={false}
                      hideToolbar={false}
                      textareaProps={{ placeholder: t('prompts.enterContent') }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-2">
                  <div
                    className="border rounded-md p-4 bg-muted/30 overflow-auto prose prose-sm max-w-none"
                    style={{ height: '350px' }}
                  >
                    {content ? (
                      <MDEditor.Markdown source={content} />
                    ) : (
                      <p className="text-muted-foreground italic">{t('prompts.noContent')}</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="split" className="mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md overflow-hidden" style={{ height: '350px' }}>
                      <MDEditor
                        value={content}
                        onChange={(val) => setContent(val || '')}
                        height="100%"
                        visibleDragbar={false}
                        hideToolbar={false}
                        textareaProps={{ placeholder: t('prompts.enterContent') }}
                      />
                    </div>
                    <div
                      className="border rounded-md p-4 bg-muted/30 overflow-auto prose prose-sm max-w-none"
                      style={{ height: '350px' }}
                    >
                      {content ? (
                        <MDEditor.Markdown source={content} />
                      ) : (
                        <p className="text-muted-foreground italic">{t('prompts.noContent')}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
