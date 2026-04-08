import { useEffect, useRef } from 'react';

export function usePerformance(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();

    if (renderCount.current === 1) {
      console.log(`[Performance] ${componentName} first render: ${endTime - startTime.current}ms`);
    }

    return () => {
      console.log(`[Performance] ${componentName} render #${renderCount.current} completed`);
    };
  });

  useEffect(() => {
    startTime.current = performance.now();
  }, []);

  return {
    renderCount: renderCount.current,
    measure: (label: string) => {
      const duration = performance.now() - startTime.current;
      console.log(`[Performance] ${componentName} - ${label}: ${duration}ms`);
    },
  };
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

export function useMemoryUsage() {
  useEffect(() => {
    const interval = setInterval(() => {
      const perf = performance as PerformanceWithMemory;
      if (perf.memory) {
        console.log('[Memory] Used:', (perf.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
        console.log('[Memory] Total:', (perf.memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
      }
    }, 30000); // Log every 30 seconds

    return () => clearInterval(interval);
  }, []);
}
