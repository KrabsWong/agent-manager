import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: { sender: { id: number } }, ...args: unknown[]) => unknown>(),
}));

vi.mock('@electron/ipc/registry', () => ({
  ipcRegistry: {
    register: vi.fn(
      (
        channel: string,
        handler: (event: { sender: { id: number } }, ...args: unknown[]) => unknown
      ) => {
        mocks.handlers.set(channel, handler);
      }
    ),
  },
}));

function eventFor(senderId: number) {
  return { sender: { id: senderId } };
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yes-sessions-file-handler-'));
  const nested = path.join(root, 'src');
  const textFile = path.join(nested, 'README.md');
  const imageFile = path.join(nested, 'image.png');

  await mkdir(nested);
  await writeFile(textFile, 'hello');
  await writeFile(imageFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  return { root, textFile, imageFile };
}

describe('file handlers', () => {
  beforeEach(async () => {
    vi.resetModules();
    mocks.handlers.clear();
    const { registerFileHandlers } = await import('@electron/handlers/file');
    registerFileHandlers();
  });

  it('allows a sender to read files after registering a tree root', async () => {
    const { root, textFile } = await createFixture();

    await mocks.handlers.get('tree:get')?.(eventFor(1), root);

    await expect(mocks.handlers.get('file:read')?.(eventFor(1), textFile)).resolves.toBe('hello');
  });

  it('does not share registered roots across sender windows', async () => {
    const { root, textFile } = await createFixture();

    await mocks.handlers.get('tree:get')?.(eventFor(1), root);

    await expect(mocks.handlers.get('file:read')?.(eventFor(2), textFile)).rejects.toThrow(
      'File path is outside the allowed directory'
    );
  });

  it('applies the same sender root boundary to image reads', async () => {
    const { root, imageFile } = await createFixture();

    await mocks.handlers.get('tree:get')?.(eventFor(3), root);

    await expect(mocks.handlers.get('file:readImage')?.(eventFor(3), imageFile)).resolves.toMatch(
      /^data:image\/png;base64,/
    );
  });
});
