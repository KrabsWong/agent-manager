import { useState, useEffect, useCallback } from 'react';

interface UseSidebarResizeOptions {
  /** 初始宽度 */
  initialWidth: number;
  /** 最小宽度 */
  minWidth: number;
  /** 最大宽度占比 (0-1)，默认 0.8 表示窗口宽度的 80% */
  maxWidthRatio?: number;
  /** 是否收起 */
  collapsed?: boolean;
  /** 收起时的宽度 */
  collapsedWidth?: number;
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
  /** 实际内容宽度（收起时为 0） */
  contentWidth: number;
}

/**
 * 侧边栏拖拽调整宽度 Hook
 * 支持收起/展开状态
 *
 * @example
 * const { width, isResizing, startResizing, style, contentWidth } = useSidebarResize({
 *   initialWidth: 320,
 *   minWidth: 160,
 *   collapsed: isCollapsed,
 *   collapsedWidth: 48,
 * });
 *
 * return (
 *   <>
 *     <div style={style}>
 *       <div style={{ width: contentWidth }}>侧边栏内容</div>
 *     </div>
 *     {!collapsed && <div onMouseDown={startResizing} className="resize-handle" />}
 *   </>
 * );
 */
export function useSidebarResize({
  initialWidth,
  minWidth,
  maxWidthRatio = 0.8,
  collapsed = false,
  collapsedWidth = 48,
}: UseSidebarResizeOptions): UseSidebarResizeReturn {
  // 保存展开时的宽度
  const [expandedWidth, setExpandedWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  // 当前显示宽度（收起时为 0，不占位）
  const width = collapsed ? 0 : expandedWidth;
  // 内容区域宽度（收起时为 0，用于隐藏内容）
  const contentWidth = collapsed ? 0 : expandedWidth;

  const startResizing = useCallback(() => {
    if (collapsed) return; // 收起状态下不能调整宽度
    setIsResizing(true);
  }, [collapsed]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && !collapsed) {
        // 实时计算最大宽度（窗口宽度的 80%），确保窗口大小变化时能正确限制
        const maxWidth = window.innerWidth * maxWidthRatio;
        // 计算新宽度，基于鼠标位置相对于容器左侧
        const newWidth = Math.max(minWidth, Math.min(e.clientX - 16, maxWidth)); // 16px 是主内容的 padding
        setExpandedWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidthRatio, collapsed]
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
    contentWidth,
  };
}
