/**
 * Git Watch Hook
 *
 * Manages git change watching lifecycle for the active session.
 * - Starts watching when session becomes active
 * - Stops watching when session becomes inactive or component unmounts
 * - Triggers callback when git changes are detected
 */

import { useEffect, useRef, useCallback } from 'react';
import { gitApi } from '@/lib/api';

interface UseGitWatchOptions {
  dirPath: string | null;
  enabled: boolean;
  onChange: () => void;
}

export function useGitWatch({ dirPath, enabled, onChange }: UseGitWatchOptions): void {
  const cleanupRef = useRef<(() => void) | null>(null);
  const isWatchingRef = useRef(false);

  const startWatching = useCallback(
    async (path: string) => {
      if (isWatchingRef.current) {
        return;
      }

      try {
        await gitApi.startWatching(path);
        isWatchingRef.current = true;
        console.log('[GitWatch] Started watching:', path);

        // Register change listener
        const unsubscribe = gitApi.onChange((changedPath) => {
          if (changedPath === path) {
            console.log('[GitWatch] Git changes detected in:', changedPath);
            onChange();
          }
        });

        cleanupRef.current = () => {
          unsubscribe();
          gitApi.stopWatching().catch(console.error);
          isWatchingRef.current = false;
          console.log('[GitWatch] Stopped watching:', path);
        };
      } catch (err) {
        console.error('[GitWatch] Failed to start watching:', err);
        isWatchingRef.current = false;
      }
    },
    [onChange]
  );

  const stopWatching = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Only watch if enabled and dirPath is valid
    if (enabled && dirPath) {
      startWatching(dirPath);
    } else {
      stopWatching();
    }

    // Cleanup on unmount
    return () => {
      stopWatching();
    };
  }, [dirPath, enabled, startWatching, stopWatching]);
}
