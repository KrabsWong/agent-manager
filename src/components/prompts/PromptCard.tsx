import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Check, FileText, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Prompt } from '@/types';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onSetActive: (prompt: Prompt) => void;
  isActive: boolean;
}

export function PromptCard({ prompt, onEdit, onDelete, onSetActive, isActive }: PromptCardProps) {
  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      className={`
        transition-all duration-200 hover:shadow-md
        ${isActive ? 'border-primary ring-1 ring-primary' : ''}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{prompt.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant="default" className="bg-primary">
                Active
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(prompt)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetActive(prompt)}
                  disabled={isActive}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Set as Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(prompt)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {prompt.description && (
          <CardDescription className="mt-2">{prompt.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="rounded-md bg-muted p-3 font-mono text-sm text-muted-foreground">
          <p className="line-clamp-4">{truncateContent(prompt.content)}</p>
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground">
          Last updated: {formatDate(prompt.updatedAt)}
        </p>
      </CardFooter>
    </Card>
  );
}
