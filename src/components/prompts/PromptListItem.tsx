import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Check, FileText, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Prompt } from '@/types';

interface PromptListItemProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onSetActive: (prompt: Prompt) => void;
  isActive: boolean;
}

export function PromptListItem({
  prompt,
  onEdit,
  onDelete,
  onSetActive,
  isActive,
}: PromptListItemProps) {
  const { t } = useTranslation();

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border
        transition-all duration-200 hover:bg-accent/50
        ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{prompt.name}</span>
            {isActive && (
              <Badge variant="default" className="bg-primary text-[10px] px-1.5 py-0 h-5 shrink-0">
                {t('prompts.activeBadge')}
              </Badge>
            )}
          </div>
          {prompt.description && (
            <p className="text-sm text-muted-foreground truncate">{prompt.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {formatDate(prompt.updatedAt)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(prompt)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetActive(prompt)} disabled={isActive}>
              <Check className="mr-2 h-4 w-4" />
              {t('prompts.setAsActive')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(prompt)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
