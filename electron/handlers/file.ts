import fs from 'fs';
import { readFile, realpath } from 'fs/promises';
import type { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry } from '../ipc/registry';
import { stringArg, treeNodesResult, validateArgs } from '../ipc/validation';
import { buildDirectoryTree } from './tree';
import { isPathInsideAnyRoot } from '../utils/path-boundary';

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
};

const allowedFileRootsBySender = new Map<number, Set<string>>();

function getSenderRoots(event: IpcMainInvokeEvent): Set<string> {
  const senderId = event.sender.id;
  let roots = allowedFileRootsBySender.get(senderId);
  if (!roots) {
    roots = new Set<string>();
    allowedFileRootsBySender.set(senderId, roots);
  }
  return roots;
}

async function registerFileRoot(event: IpcMainInvokeEvent, dirPath: string): Promise<string> {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('Invalid directory path');
  }

  const rootPath = await realpath(dirPath);
  const stats = await fs.promises.stat(rootPath);
  if (!stats.isDirectory()) {
    throw new Error('Path is not a directory');
  }

  getSenderRoots(event).add(rootPath);
  return rootPath;
}

async function resolveReadableFilePath(
  event: IpcMainInvokeEvent,
  filePath: string
): Promise<string> {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  const resolvedPath = await realpath(filePath);
  if (!isPathInsideAnyRoot(resolvedPath, getSenderRoots(event))) {
    throw new Error('File path is outside the allowed directory');
  }

  return resolvedPath;
}

export function registerFileHandlers(): void {
  ipcRegistry.register(
    'tree:get',
    async (event, ...args: unknown[]) => {
      const [dirPath] = args as [string];
      const rootPath = await registerFileRoot(event, dirPath);
      return buildDirectoryTree(rootPath);
    },
    {
      validateArgs: validateArgs(stringArg('dirPath')),
      validateResult: treeNodesResult(),
    }
  );

  ipcRegistry.register(
    'file:read',
    async (event, ...args: unknown[]) => {
      const [filePath] = args as [string];
      const resolvedPath = await resolveReadableFilePath(event, filePath);

      const stats = await fs.promises.stat(resolvedPath);
      if (stats.isDirectory()) {
        throw new Error('Cannot read directory as file');
      }
      if (stats.size > 50 * 1024 * 1024) {
        throw new Error('File too large (>50MB)');
      }

      return readFile(resolvedPath, 'utf-8');
    },
    { validateArgs: validateArgs(stringArg('filePath')) }
  );

  ipcRegistry.register(
    'file:readImage',
    async (event, ...args: unknown[]) => {
      const [filePath] = args as [string];
      const resolvedPath = await resolveReadableFilePath(event, filePath);

      const stats = await fs.promises.stat(resolvedPath);
      if (stats.isDirectory()) {
        throw new Error('Cannot read directory as image');
      }
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error('Image too large (>10MB)');
      }

      const buffer = await readFile(resolvedPath);
      const ext = resolvedPath.split('.').pop()?.toLowerCase() || '';
      const mimeType = IMAGE_MIME_TYPES[ext] || 'image/png';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    },
    { validateArgs: validateArgs(stringArg('filePath')) }
  );
}
