import { useState, useEffect, useCallback } from 'react';

interface UseSidebarResizeOptions {
  /** 初始宽度 */
  initialWidth: number;
  /** 最小宽度 */
  minWidth: number;
  /** 最大宽度占比 (0-1)，默认 0.8 表示窗口宽度的 80% */
  maxWidthRatio?: number;
}

interface UseSidebarResizeReturn {
  /** 当前宽度 */
  width: number;
  /** 是否正在拖拽 */
  isResizing: boolean;
  /** 开始拖拽 */
  startResizing: () => void;
  /** 应用到元素上的样式 */
  style: React.CSSProperties;
}

/**
 * 侧边栏拖拽调整宽度 Hook
 *
 * @example
 * const { width, isResizing, startResizing, style } = useSidebarResize({
 *   initialWidth: 320,
 *   minWidth: 160,
 * });
 *
 * return (
 *   <>
 *     <div style={style}>侧边栏内容</div>
 *     <div onMouseDown={startResizing} className="resize-handle" />
 *   </>
 * );
 */
export function useSidebarResize({
  initialWidth,
  minWidth,
  maxWidthRatio = 0.8,
}: UseSidebarResizeOptions): UseSidebarResizeReturn {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        // 实时计算最大宽度（窗口宽度的 80%），确保窗口大小变化时能正确限制
        const maxWidth = window.innerWidth * maxWidthRatio;
        // 计算新宽度，基于鼠标位置相对于容器左侧
        const newWidth = Math.max(minWidth, Math.min(e.clientX - 16, maxWidth)); // 16px 是主内容的 padding
        setWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidthRatio]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResizing);
      // 防止拖拽时选中文本
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, resize, stopResizing]);

  return {
    width,
    isResizing,
    startResizing,
    style: { width: `${width}px` },
  };
}
