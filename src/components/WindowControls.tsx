import { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial maximized state
    const checkMaximized = async () => {
      try {
        const result = await window.electronAPI.invoke('app:isMaximized');
        setIsMaximized(result as boolean);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    };
    checkMaximized();

    // Listen for window state changes (optional - if we add events later)
    // For now, we check on minimize/restore
  }, []);

  const handleMinimize = async () => {
    try {
      await window.electronAPI.invoke('app:minimize');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await window.electronAPI.invoke('app:restore');
      } else {
        await window.electronAPI.invoke('app:maximize');
      }
      setIsMaximized(!isMaximized);
    } catch (error) {
      console.error('Failed to maximize/restore window:', error);
    }
  };

  const handleClose = async () => {
    try {
      await window.electronAPI.invoke('app:close');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md hover:bg-accent"
        onClick={handleMinimize}
        title="Minimize"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md hover:bg-accent"
        onClick={handleMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md hover:bg-destructive hover:text-destructive-foreground"
        onClick={handleClose}
        title="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
