import { useState, useEffect } from 'react';
import { appApi } from '@/lib/api';

/**
 * Hook to get the application version from package.json
 * Uses Electron's app.getVersion() API
 */
export function useVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await appApi.getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error('Failed to get app version:', error);
        setVersion(null);
      }
    };

    fetchVersion();
  }, []);

  return version;
}
