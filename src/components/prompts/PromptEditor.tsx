import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      newErrors.name = 'Name is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? 'Edit Prompt' : 'Create Prompt'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your system prompt with a name, description, and content.'
              : 'Create a new system prompt with a name, description, and content.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter prompt name..."
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter optional description..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                Content <span className="text-destructive">*</span>
              </Label>
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="edit" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="split" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    <Eye className="h-4 w-4" />
                    Split
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="mt-2">
                  <div className="border rounded-md overflow-hidden" style={{ height: '400px' }}>
                    <MDEditor
                      value={content}
                      onChange={(val) => setContent(val || '')}
                      height="100%"
                      visibleDragbar={false}
                      hideToolbar={false}
                      textareaProps={{ placeholder: 'Enter your system prompt here...' }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-2">
                  <div
                    className="border rounded-md p-4 overflow-auto"
                    style={{ height: '400px' }}
                  >
                    <MDEditor.Markdown
                      source={content || '*No content*'}
                      style={{ background: 'transparent' }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="split" className="mt-2">
                  <div className="border rounded-md overflow-hidden" style={{ height: '400px' }}>
                    <div className="grid grid-cols-2 h-full">
                      <div className="border-r h-full">
                        <MDEditor
                          value={content}
                          onChange={(val) => setContent(val || '')}
                          height="100%"
                          visibleDragbar={false}
                          hideToolbar={false}
                          textareaProps={{ placeholder: 'Enter your system prompt here...' }}
                        />
                      </div>
                      <div className="p-4 overflow-auto h-full">
                        <MDEditor.Markdown
                          source={content || '*No content*'}
                          style={{ background: 'transparent' }}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content}</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
