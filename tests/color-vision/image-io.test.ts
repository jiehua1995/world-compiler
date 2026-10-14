// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { decodeLocalImage, type DecodeEnvironment } from '../../src/features/color-vision/image-io';

function environment(width = 640, height = 480): DecodeEnvironment {
  return {
    createObjectURL: vi.fn(() => 'blob:fixture'),
    revokeObjectURL: vi.fn(),
    decode: vi.fn(async () => ({ width, height }) as ImageBitmap),
  };
}

describe('decodeLocalImage', () => {
  it('returns decoded metadata and revokes its URL exactly once', async () => {
    const env = environment();
    const file = new File(['pixels'], 'fixture.png', { type: 'image/png' });

    const decoded = await decodeLocalImage(file, env);

    expect(decoded.width).toBe(640);
    expect(decoded.height).toBe(480);
    decoded.cleanup();
    decoded.cleanup();
    expect(env.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(env.revokeObjectURL).toHaveBeenCalledWith('blob:fixture');
  });

  it('rejects unsupported declared types before decoding', async () => {
    const env = environment();
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    await expect(decodeLocalImage(file, env)).rejects.toMatchObject({ code: 'unsupported-type' });
    expect(env.decode).not.toHaveBeenCalled();
  });

  it('maps corrupt or MIME-spoofed image decode failures', async () => {
    const env = environment();
    vi.mocked(env.decode).mockRejectedValueOnce(new Error('Invalid image bytes'));
    const file = new File(['not an image'], 'spoofed.png', { type: 'image/png' });

    await expect(decodeLocalImage(file, env)).rejects.toMatchObject({ code: 'decode-failed' });
    expect(env.revokeObjectURL).toHaveBeenCalledWith('blob:fixture');
  });

  it('maps unsafe dimensions and releases the decoded resource', async () => {
    const close = vi.fn();
    const env = environment(20_000, 10);
    vi.mocked(env.decode).mockResolvedValueOnce({ width: 20_000, height: 10, close } as unknown as ImageBitmap);

    await expect(
      decodeLocalImage(new File(['pixels'], 'huge.png', { type: 'image/png' }), env),
    ).rejects.toMatchObject({ code: 'too-large' });
    expect(close).toHaveBeenCalledOnce();
    expect(env.revokeObjectURL).toHaveBeenCalledOnce();
  });
});
