/**
 * Session Files Extractor
 *
 * Extract file paths, directories and URLs from session messages for the context panel
 */

import type { SessionMessage } from '@/types/session';
import { parseMessageContent, hasSpecialParser } from '@/components/sessions/parsers';

export type ReferenceType = 'file' | 'directory' | 'url';

export interface Reference {
  path: string;
  type: ReferenceType;
  source: 'read' | 'write' | 'edit' | 'attachment' | 'mention' | 'tool_result';
  timestamp: string;
}

export interface ReferenceGroup {
  category: ReferenceType;
  title: string;
  items: Reference[];
}

// URL patterns to exclude from file paths
function isURL(str: string): boolean {
  return /^https?:\/\//.test(str) || /^ftp:\/\//.test(str) || /^www\./.test(str);
}

// Common non-path words to exclude
const NON_PATH_WORDS = new Set([
  'read',
  'write',
  'edit',
  'view',
  'cat',
  'glob',
  'grep',
  'ls',
  'mkdir',
  'bash',
  'tool',
  'result',
  'output',
  'input',
  'param',
  'arg',
  'flag',
]);

// Check if a string looks like a valid file path
function isValidFilePath(path: string): boolean {
  // Must start with /
  if (!path.startsWith('/')) return false;

  // Get the last part (filename or last directory)
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return false;

  const lastPart = parts[parts.length - 1].toLowerCase();

  // Exclude common tool names
  if (NON_PATH_WORDS.has(lastPart)) return false;

  // Must have at least 2 parts (e.g., /dir/file) OR have a file extension
  const hasExtension = lastPart.includes('.') && !lastPart.startsWith('.');
  return parts.length >= 2 || hasExtension;
}

// Check if a path looks like a file (has extension) vs directory
function isFilePath(path: string): boolean {
  const cleanPath = path.replace(/\/$/, '');
  const fileName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
  return fileName.includes('.') && !fileName.startsWith('.');
}

// Extract URLs from text
function extractURLs(text: string): string[] {
  const urls: string[] = [];
  const urlRegex = /https?:\/\/[^\s<>"'{}|\^`\[\]]+/gi;
  const matches = text.match(urlRegex);
  if (matches) {
    urls.push(...matches.map((url) => url.replace(/[.,;:!?]$/, '')));
  }
  return urls;
}
// Extract file paths from tool input
function extractPathsFromToolInput(toolInput: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const pathKeys = [
    'file_path',
    'path',
    'file',
    'target_file',
    'source_file',
    'files',
    'directory',
    'dir',
  ];

  for (const key of pathKeys) {
    const value = toolInput[key];
    if (typeof value === 'string' && value.startsWith('/') && !isURL(value)) {
      paths.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('/') && !isURL(item)) {
          paths.push(item);
        }
      }
    }
  }
  return paths;
}

// Extract references from tool output
function extractReferencesFromToolOutput(
  toolOutput: SessionMessage['tool_output']
): Array<{ path: string; type: ReferenceType }> {
  if (!toolOutput) return [];

  const refs: Array<{ path: string; type: ReferenceType }> = [];

  const extractFromText = (text: string) => {
    // Extract URLs first and save them
    const urls = extractURLs(text);
    urls.forEach((url) => refs.push({ path: url, type: 'url' }));

    // Remove URLs from text to avoid matching their path parts
    let textWithoutURLs = text;
    for (const url of urls) {
      textWithoutURLs = textWithoutURLs.replace(url, '');
    }

    // Extract file paths from text without URLs
    // Match: /path/to/file.ext or /path/to/dir (at least 2 levels or has extension)
    const pathRegex = /\/[\/\.\w-]+/g;
    const matches = textWithoutURLs.match(pathRegex);
    if (matches) {
      for (const match of matches) {
        // Strict validation
        if (!isURL(match) && isValidFilePath(match)) {
          const type: ReferenceType = isFilePath(match) ? 'file' : 'directory';
          refs.push({ path: match, type });
        }
      }
    }
  };

  if (typeof toolOutput.output === 'string') {
    extractFromText(toolOutput.output);
  }

  if (toolOutput.content && Array.isArray(toolOutput.content)) {
    for (const item of toolOutput.content) {
      if (item.text) {
        extractFromText(item.text);
      }
    }
  }

  return refs;
}
// Extract references from message content
function extractReferencesFromContent(
  content: string,
  appType: string
): Array<{ path: string; type: ReferenceType }> {
  const refs: Array<{ path: string; type: ReferenceType }> = [];

  // First extract URLs
  const urls = extractURLs(content);
  urls.forEach((url) => refs.push({ path: url, type: 'url' }));

  // Then extract file paths from parsed content
  if (hasSpecialParser(appType)) {
    const parsed = parseMessageContent(content, appType);
    for (const item of parsed) {
      if (item.type === 'file' && item.metadata?.path) {
        const path = item.metadata.path;
        if (!isURL(path)) {
          refs.push({
            path,
            type: isFilePath(path) ? 'file' : 'directory',
          });
        }
      }
    }
  }

  // Extract any absolute paths in the content (but not URLs)
  // First remove URLs from content to avoid matching their path parts
  let contentWithoutURLs = content;
  for (const url of urls) {
    contentWithoutURLs = contentWithoutURLs.replace(url, '');
  }

  // Use strict pattern and validation
  const pathRegex = /\/[\/\.\w-]+/g;
  const matches = contentWithoutURLs.match(pathRegex);
  if (matches) {
    for (const match of matches) {
      // Skip if already captured, is URL, or doesn't look like valid path
      if (!isURL(match) && !refs.some((r) => r.path === match) && isValidFilePath(match)) {
        refs.push({
          path: match,
          type: isFilePath(match) ? 'file' : 'directory',
        });
      }
    }
  }

  return refs;
}
// Extract all references from session messages
export function extractSessionReferences(messages: SessionMessage[], appType: string): Reference[] {
  const refMap = new Map<string, Reference>();

  for (const message of messages) {
    let source: Reference['source'] = 'mention';

    switch (message.type) {
      case 'user':
        source = 'attachment';
        if (message.content) {
          const refs = extractReferencesFromContent(message.content, appType);
          refs.forEach(({ path, type }) => {
            if (!refMap.has(path)) {
              refMap.set(path, {
                path,
                type,
                source,
                timestamp: message.timestamp,
              });
            }
          });
        }
        break;

      case 'tool_use':
        if (message.tool_name) {
          const toolName = message.tool_name.toLowerCase();
          if (['read', 'view', 'cat'].includes(toolName)) {
            source = 'read';
          } else if (['write', 'create'].includes(toolName)) {
            source = 'write';
          } else if (['edit', 'modify', 'replace'].includes(toolName)) {
            source = 'edit';
          }
        }
        if (message.tool_input) {
          const paths = extractPathsFromToolInput(message.tool_input);
          paths.forEach((path) => {
            if (!refMap.has(path)) {
              refMap.set(path, {
                path,
                type: isFilePath(path) ? 'file' : 'directory',
                source,
                timestamp: message.timestamp,
              });
            }
          });
        }
        break;

      case 'tool_result':
        source = 'tool_result';
        if (message.tool_output) {
          const refs = extractReferencesFromToolOutput(message.tool_output);
          refs.forEach(({ path, type }) => {
            if (!refMap.has(path)) {
              refMap.set(path, {
                path,
                type,
                source,
                timestamp: message.timestamp,
              });
            }
          });
        }
        break;

      case 'assistant':
        source = 'mention';
        if (message.content) {
          const refs = extractReferencesFromContent(message.content, appType);
          refs.forEach(({ path, type }) => {
            if (!refMap.has(path)) {
              refMap.set(path, {
                path,
                type,
                source,
                timestamp: message.timestamp,
              });
            }
          });
        }
        break;
    }
  }

  return Array.from(refMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
// Group references by type and directory
export function groupReferencesByType(
  refs: Reference[],
  _sessionDirectory?: string
): ReferenceGroup[] {
  const files: Reference[] = [];
  const directories: Reference[] = [];
  const urls: Reference[] = [];

  for (const ref of refs) {
    switch (ref.type) {
      case 'file':
        files.push(ref);
        break;
      case 'directory':
        directories.push(ref);
        break;
      case 'url':
        urls.push(ref);
        break;
    }
  }

  const groups: ReferenceGroup[] = [];

  if (files.length > 0) {
    groups.push({
      category: 'file',
      title: 'Files',
      items: files,
    });
  }

  if (directories.length > 0) {
    groups.push({
      category: 'directory',
      title: 'Directories',
      items: directories,
    });
  }

  if (urls.length > 0) {
    groups.push({
      category: 'url',
      title: 'Links',
      items: urls,
    });
  }

  return groups;
}

// Group files by their parent directory
export function groupFilesByDirectory(
  files: Reference[],
  sessionDirectory?: string
): Array<{ directory: string; files: Reference[] }> {
  const groups = new Map<string, Reference[]>();

  // Filter out URLs - only process file and directory types
  const validFiles = files.filter((f) => f.type === 'file' || f.type === 'directory');

  for (const file of validFiles) {
    const dir = file.path.substring(0, file.path.lastIndexOf('/')) || '/';

    let displayDir = dir;
    if (sessionDirectory && dir.startsWith(sessionDirectory)) {
      displayDir = dir.substring(sessionDirectory.length) || '/';
      if (displayDir.startsWith('/')) {
        displayDir = displayDir.substring(1);
      }
    }

    if (!groups.has(displayDir)) {
      groups.set(displayDir, []);
    }
    groups.get(displayDir)!.push(file);
  }

  return Array.from(groups.entries())
    .map(([directory, files]) => ({ directory, files }))
    .sort((a, b) => {
      const depthDiff = a.directory.split('/').length - b.directory.split('/').length;
      if (depthDiff !== 0) return depthDiff;
      return a.directory.localeCompare(b.directory);
    });
}
// Get file name from full path
export function getFileName(path: string): string {
  return path.substring(path.lastIndexOf('/') + 1);
}

// Get file extension
export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.substring(dotIndex + 1).toLowerCase() : '';
}

// Get icon color based on file type
export function getFileIconColor(path: string): string {
  const ext = getFileExtension(path);
  const colorMap: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-400',
    js: 'text-yellow-500',
    jsx: 'text-yellow-400',
    py: 'text-green-500',
    go: 'text-cyan-500',
    rs: 'text-orange-500',
    java: 'text-red-500',
    json: 'text-gray-500',
    md: 'text-purple-500',
    yml: 'text-pink-500',
    yaml: 'text-pink-500',
    css: 'text-blue-300',
    scss: 'text-pink-400',
    html: 'text-orange-400',
    sh: 'text-gray-400',
    bash: 'text-gray-400',
  };
  return colorMap[ext] || 'text-gray-400';
}

// Get hostname from URL for display
export function getURLDisplayName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
}

// Tree view types
export interface DirectoryNode {
  name: string;
  fullPath: string;
  children: DirectoryNode[];
  files: Reference[];
}

// Build a tree structure from file paths
export function buildDirectoryTree(files: Reference[], sessionDirectory?: string): DirectoryNode[] {
  const root: Map<string, DirectoryNode> = new Map();

  // Filter only files
  const fileRefs = files.filter((f) => f.type === 'file');

  for (const file of fileRefs) {
    // Get directory path relative to session directory
    let dirPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';

    if (sessionDirectory && dirPath.startsWith(sessionDirectory)) {
      dirPath = dirPath.substring(sessionDirectory.length) || '/';
      if (dirPath.startsWith('/')) {
        dirPath = dirPath.substring(1);
      }
    }

    // Split path into parts
    const parts = dirPath.split('/').filter(Boolean);

    // Build tree nodes
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!root.has(currentPath)) {
        root.set(currentPath, {
          name: part,
          fullPath: currentPath,
          children: [],
          files: [],
        });
      }

      // Add file to the leaf node
      if (i === parts.length - 1) {
        root.get(currentPath)!.files.push(file);
      }
    }
  }

  // Build parent-child relationships
  const nodes = Array.from(root.values());
  const nodeMap = new Map(nodes.map((n) => [n.fullPath, n]));

  for (const node of nodes) {
    const parentPath = node.fullPath.substring(0, node.fullPath.lastIndexOf('/'));
    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    }
  }

  // Return only root nodes (those without parents)
  return nodes.filter((n) => {
    const parentPath = n.fullPath.substring(0, n.fullPath.lastIndexOf('/'));
    return !parentPath || !nodeMap.has(parentPath);
  });
}

// Backward compatibility - keep old function names
export function extractSessionFiles(messages: SessionMessage[], appType: string): Reference[] {
  return extractSessionReferences(messages, appType).filter((r) => r.type !== 'url');
}

export interface FileGroup {
  directory: string;
  files: Reference[];
}
