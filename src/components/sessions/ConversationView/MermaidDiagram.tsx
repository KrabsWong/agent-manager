/**
 * Mermaid Diagram Components
 *
 * Mermaid 图表渲染和缩放控制
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  content: string;
}

export const MermaidDiagram = memo(function MermaidDiagram({ content }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current) return;
    renderedRef.current = true;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError('');

        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        const renderPromise = mermaid.render(id, content.trim());
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Render timeout')), 10000);
        });

        const { svg: renderedSvg } = (await Promise.race([renderPromise, timeoutPromise])) as {
          svg: string;
        };
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [content]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'strict',
          });
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (showRaw) {
    return (
      <div className="rounded-md border border-primary-border bg-primary-muted">
        <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-light">
          <span className="text-xs text-primary">Mermaid (Raw)</span>
          <button
            onClick={() => setShowRaw(false)}
            className="text-xs text-primary hover:text-primary-hover underline"
          >
            Try render
          </button>
        </div>
        <pre className="p-3 text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-primary-border bg-primary-muted p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
          <button
            onClick={() => setShowRaw(true)}
            className="text-xs text-primary hover:text-primary-hover underline"
          >
            View raw
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <div className="flex items-start gap-2">
          <span className="text-destructive text-sm font-medium">Failed to render Mermaid diagram:</span>
        </div>
        <pre className="mt-2 text-xs text-destructive/80 overflow-auto">{error}</pre>
        <div className="mt-3 pt-3 border-t border-destructive/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Original syntax:</span>
            <button
              onClick={() => {
                renderedRef.current = false;
                setError('');
                setIsLoading(true);
                setTimeout(() => {
                  const renderDiagram = async () => {
                    try {
                      mermaid.initialize({
                        startOnLoad: false,
                        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
                        securityLevel: 'loose',
                      });
                      const id = `mermaid-retry-${Math.random().toString(36).substr(2, 9)}`;
                      const { svg: renderedSvg } = await mermaid.render(id, content.trim());
                      setSvg(renderedSvg);
                      setIsLoading(false);
                    } catch (err) {
                      console.error('Mermaid retry error:', err);
                      setError(err instanceof Error ? err.message : 'Failed to render diagram');
                      setIsLoading(false);
                    }
                  };
                  renderDiagram();
                }, 100);
              }}
              className="text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
          <pre className="text-xs text-muted-foreground overflow-auto">{content}</pre>
        </div>
      </div>
    );
  }

  return <MermaidDiagramWithZoom svg={svg} />;
});

interface MermaidDiagramWithZoomProps {
  svg: string;
}

function MermaidDiagramWithZoom({ svg }: MermaidDiagramWithZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgDimensionsRef = useRef({ width: 0, height: 0 });

  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return;

    if (svgDimensionsRef.current.width === 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (svgElement) {
        let svgWidth =
          svgElement.viewBox?.baseVal?.width ||
          parseFloat(svgElement.getAttribute('width') || '0');
        let svgHeight =
          svgElement.viewBox?.baseVal?.height ||
          parseFloat(svgElement.getAttribute('height') || '0');

        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox && (!svgWidth || !svgHeight)) {
          const parts = viewBox.split(' ').map(Number);
          if (parts.length === 4) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }

        svgDimensionsRef.current = { width: svgWidth, height: svgHeight };
      }
    }

    const { width: svgWidth, height: svgHeight } = svgDimensionsRef.current;

    if (svgWidth && svgHeight && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const fitScale = Math.min(scaleX, scaleY);

      setScale(fitScale);
      const scaledWidth = svgWidth * fitScale;
      const scaledHeight = svgHeight * fitScale;
      setPosition({
        x: (containerWidth - scaledWidth) / 2,
        y: (containerHeight - scaledHeight) / 2,
      });
    }
  }, [svg]);

  useEffect(() => {
    svgDimensionsRef.current = { width: 0, height: 0 };
    calculateFitScale();
    window.addEventListener('resize', calculateFitScale);
    return () => window.removeEventListener('resize', calculateFitScale);
  }, [calculateFitScale]);

  const handleZoomIn = () => setScale((s) => s * 1.2);
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
  const handleReset = useCallback(() => {
    calculateFitScale();
  }, [calculateFitScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(Math.max(s * delta, 0.1), 5));
    }
  };

  return (
    <div className="rounded-md border border-primary-border bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-muted">
        <span className="text-xs text-primary">Mermaid Diagram</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-primary-light text-primary transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-primary min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-primary-light text-primary transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="ml-2 px-2 py-1 text-xs rounded hover:bg-primary-light transition-colors text-primary"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing bg-primary-muted/30"
        style={{ height: '500px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={contentRef}
          className="origin-top-left"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <div className="px-3 py-1.5 border-t border-primary-border bg-primary-muted">
        <span className="text-[10px] text-primary">Drag to pan • Ctrl/Cmd + scroll to zoom</span>
      </div>
    </div>
  );
}

export default MermaidDiagram;
