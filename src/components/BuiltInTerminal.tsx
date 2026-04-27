/**
 * Built-in Terminal Component with Tabs
 *
 * An integrated terminal using xterm.js and node-pty
 * Supports multiple tabs for different sessions
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ptyApi, type PTYSession } from '@/lib/api';
import { getAppIcon } from '@/components/AppIcons';
import '@xterm/xterm/css/xterm.css';
import './terminal.css';

export interface TerminalTab {
  id: string;
  sessionId: string;
  appType: string;
  workingDir?: string;
  sessionName: string;
  ptySession?: PTYSession;
  isReady: boolean;
}

export interface BuiltInTerminalRef {
  replay: (sessionId: string, appType: string, sessionName: string, workingDir?: string) => Promise<void>;
  openOrSwitchTab: (sessionId: string, appType: string, workingDir?: string, sessionName?: string) => void;
  closeTab: (tabId: string) => void;
}

interface BuiltInTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT_RATIO = 0.85;
const DEFAULT_HEIGHT = 280;
const COLLAPSED_HEIGHT = 32; // Header only height

export const BuiltInTerminal = forwardRef<BuiltInTerminalRef, BuiltInTerminalProps>(
  function BuiltInTerminal({ isOpen, onClose }, ref) {
    // Note: Translation hook available for future use
    useTranslation();
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);
    const [prevHeight, setPrevHeight] = useState(DEFAULT_HEIGHT);
    const tabsRef = useRef<Map<string, TerminalTab>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeStartYRef = useRef(0);
    const resizeStartHeightRef = useRef(DEFAULT_HEIGHT);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      replay: async (sessionId: string, appType: string, sessionName: string, workingDir?: string) => {
        // When replaying, ensure panel is not minimized
        setIsMinimized(false);
        
        // Find or create tab for this session
        let tab = Array.from(tabsRef.current.values()).find(
          (t) => t.sessionId === sessionId
        );

        // If no tab exists, create one
        if (!tab) {
          const tabId = await createTab(sessionId, appType, workingDir, sessionName);
          tab = tabsRef.current.get(tabId);
        }

        if (tab && tab.ptySession && tab.isReady) {
          // Build resume command based on app type
          let resumeCommand = '';
          switch (appType) {
            case 'claude':
              resumeCommand = `claude --resume=${sessionId}`;
              break;
            case 'claude-internal':
              resumeCommand = `claude-internal --resume ${sessionId}`;
              break;
            case 'opencode':
              resumeCommand = `opencode -s ${sessionId}`;
              break;
            case 'codebuddy':
              resumeCommand = `codebuddy --resume=${sessionId}`;
              break;
            default:
              tab.ptySession.terminal.writeln(
                `\r\n\x1b[33mResume not supported for ${appType}\x1b[0m`
              );
              return;
          }

          // Wait for shell to be ready before sending command
          await new Promise(resolve => setTimeout(resolve, 800));

          // Type the command and press enter
          await ptyApi.write(tab.id, resumeCommand + '\r');
        }
      },

      openOrSwitchTab: (sessionId: string, appType: string, workingDir?: string, sessionName?: string) => {
        // When opening, ensure panel is visible and not minimized
        setIsMinimized(false);
        
        const existingTab = Array.from(tabsRef.current.values()).find(
          (t) => t.sessionId === sessionId
        );

        if (existingTab) {
          setActiveTabId(existingTab.id);
        } else {
          createTab(sessionId, appType, workingDir, sessionName);
        }
      },

      closeTab: (tabId: string) => {
        handleCloseTab(tabId);
      },
    }));

    // Create a new tab
    const createTab = async (
      sessionId: string,
      appType: string,
      workingDir?: string,
      sessionName?: string
    ) => {
      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const displayName = sessionName || sessionId.slice(0, 8);

      const newTab: TerminalTab = {
        id: tabId,
        sessionId,
        appType,
        workingDir,
        sessionName: displayName,
        isReady: false,
      };

      tabsRef.current.set(tabId, newTab);
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);

      // Create PTY session
      const ptySession = await ptyApi.create(tabId, workingDir);

      if (ptySession) {
        newTab.ptySession = ptySession;
        newTab.isReady = true;

        setTimeout(() => {
          const container = document.getElementById(`terminal-${tabId}`);
          if (container) {
            ptySession.terminal.open(container);
            
            // Force a fit to calculate dimensions
            ptySession.fitAddon.fit();
            
            // Get calculated dimensions and resize PTY
            const dims = ptySession.fitAddon.proposeDimensions();
            if (dims) {
              const { cols, rows } = dims;
              ptySession.terminal.resize(cols, rows);
              ptyApi.resize(tabId, cols, rows);
            }

            const handleResize = () => {
              if (tabsRef.current.get(tabId)?.isReady) {
                ptySession.fitAddon.fit();
                const newDims = ptySession.fitAddon.proposeDimensions();
                if (newDims) {
                  ptySession.terminal.resize(newDims.cols, newDims.rows);
                  ptyApi.resize(tabId, newDims.cols, newDims.rows);
                }
              }
            };

            window.addEventListener('resize', handleResize);

            (newTab.ptySession as PTYSession & { cleanup?: () => void }) = {
              ...ptySession,
              cleanup: () => window.removeEventListener('resize', handleResize),
            };
          }
        }, 100);
      }

      return tabId;
    };

    // Close a tab
    const handleCloseTab = (tabId: string) => {
      const tab = tabsRef.current.get(tabId);
      if (!tab) return;

      // Dispose terminal
      if (tab.ptySession) {
        try {
          tab.ptySession.terminal.dispose();
        } catch (e) {
          // ignore
        }
        if ('cleanup' in tab.ptySession) {
          (tab.ptySession as PTYSession & { cleanup: () => void }).cleanup();
        }
      }

      // Kill PTY
      ptyApi.kill(tabId);

      // Remove from refs first
      tabsRef.current.delete(tabId);
      
      // Check remaining tabs before updating state
      const remainingTabs = Array.from(tabsRef.current.values());
      
      // Update state
      setTabs(prev => prev.filter(t => t.id !== tabId));

      // Update active tab or close panel if no tabs left
      if (activeTabId === tabId) {
        if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[remainingTabs.length - 1].id);
        } else {
          setActiveTabId('');
          // Close the entire panel when all tabs are closed
          onClose();
        }
      } else if (remainingTabs.length === 0) {
        // If closing non-active tab but it's the last one
        setActiveTabId('');
        onClose();
      }
    };

    // Toggle minimize/restore
    const handleToggleMinimize = () => {
      if (isMinimized) {
        // Restore
        setIsMinimized(false);
        setHeight(prevHeight);
        // Trigger resize after restore
        setTimeout(() => {
          tabs.forEach(tab => {
            if (tab.ptySession) {
              tab.ptySession.fitAddon.fit();
              const dims = tab.ptySession.fitAddon.proposeDimensions();
              if (dims) {
                tab.ptySession.terminal.resize(dims.cols, dims.rows);
                ptyApi.resize(tab.id, dims.cols, dims.rows);
              }
            }
          });
        }, 300);
      } else {
        // Minimize
        setPrevHeight(height);
        setIsMinimized(true);
      }
    };

    // Resize handlers - only resize terminal after drag ends
    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartYRef.current = e.clientY;
      resizeStartHeightRef.current = height;
    };

    useEffect(() => {
      if (!isResizing) return;

      // Track new height during drag but don't resize terminal yet
      const handleMouseMove = (e: MouseEvent) => {
        const delta = resizeStartYRef.current - e.clientY;
        const newHeight = Math.min(
          Math.max(resizeStartHeightRef.current + delta, MIN_HEIGHT),
          window.innerHeight * MAX_HEIGHT_RATIO
        );
        setHeight(newHeight);
        setIsMinimized(false);
      };

      // Only resize terminal once when drag ends
      const handleMouseUp = () => {
        setIsResizing(false);
        // Resize all terminals after drag ends
        tabs.forEach(tab => {
          if (tab.ptySession) {
            tab.ptySession.fitAddon.fit();
            const dims = tab.ptySession.fitAddon.proposeDimensions();
            if (dims) {
              tab.ptySession.terminal.resize(dims.cols, dims.rows);
              ptyApi.resize(tab.id, dims.cols, dims.rows);
            }
          }
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizing, tabs]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        tabsRef.current.forEach(tab => {
          if (tab.ptySession) {
            try {
              tab.ptySession.terminal.dispose();
            } catch (e) {
              // ignore
            }
            if ('cleanup' in tab.ptySession) {
              (tab.ptySession as PTYSession & { cleanup: () => void }).cleanup();
            }
          }
          ptyApi.kill(tab.id);
        });
        tabsRef.current.clear();
      };
    }, []);

    if (!isOpen) return null;

    const currentHeight = isMinimized ? COLLAPSED_HEIGHT : height;

    return (
      <div
        ref={containerRef}
        className={cn(
          'flex flex-col border-t bg-background relative',
          // Disable transition during resize for better performance
          isResizing ? 'select-none' : 'transition-all duration-300'
        )}
        style={{ height: currentHeight }}
      >
        {/* Resize Handle - only visible when not minimized */}
        {!isMinimized && (
          <div
            className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-10"
            onMouseDown={handleResizeStart}
          >
            <div className="w-12 h-1 bg-border rounded-full opacity-50 hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-2 h-8 border-b bg-muted/50 shrink-0">
          {/* Tabs - show tab count when minimized */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 h-full">
            {isMinimized ? (
              <div className="flex items-center h-full text-xs text-muted-foreground px-2">
                {tabs.length} terminal{tabs.length > 1 ? 's' : ''} running
              </div>
            ) : (
              tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 h-6 text-xs rounded-md transition-colors whitespace-nowrap max-w-[200px]',
                    activeTabId === tab.id
                      ? 'bg-background text-foreground border border-border shadow-sm'
                      : 'text-muted-foreground hover:bg-background/50'
                  )}
                >
                  <span className="shrink-0">
                    {getAppIcon(tab.appType as import('@/types').AppType, 14)}
                  </span>
                  <span className="truncate">{tab.sessionName}</span>
                  <span
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted shrink-0"
                    onClick={e => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-2 shrink-0 h-full">
            {/* Minimize/Restore Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleToggleMinimize}
              disabled={tabs.length === 0}
              title={isMinimized ? 'Restore' : 'Minimize to bottom'}
            >
              {isMinimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Terminal Container - use CSS to hide when minimized instead of conditional rendering */}
        <div 
          className={cn(
            "flex-1 overflow-hidden bg-[#1a1a1a] relative",
            isMinimized && "h-0 overflow-hidden"
          )}
        >
          {tabs.map(tab => (
            <div
              key={tab.id}
              id={`terminal-${tab.id}`}
              className={cn(
                'absolute inset-0',
                activeTabId === tab.id ? 'visible' : 'invisible'
              )}
            />
          ))}
          {tabs.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a session to open terminal
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default BuiltInTerminal;
