import path from 'path';

function isPathInsideRoot(filePath: string, rootPath: string): boolean {
  const resolvedFile = path.resolve(filePath);
  const resolvedRoot = path.resolve(rootPath);
  return resolvedFile === resolvedRoot || resolvedFile.startsWith(`${resolvedRoot}${path.sep}`);
}

export function isPathInsideAnyRoot(filePath: string, rootPaths: Iterable<string>): boolean {
  for (const rootPath of rootPaths) {
    if (isPathInsideRoot(filePath, rootPath)) {
      return true;
    }
  }
  return false;
}
