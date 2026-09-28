import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { lookupPublicPaths, revalidateAfterWrite, revalidatePublicPaths } from './revalidate';

const mockRevalidatePath = vi.mocked(revalidatePath);
const revalidated = () => mockRevalidatePath.mock.calls.map((call) => call[0]);

describe('revalidatePublicPaths', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('revalidates each distinct path once', () => {
    revalidatePublicPaths(['/brad/a', '/brad/b', '/brad/a']);

    expect(revalidated()).toEqual(['/brad/a', '/brad/b']);
  });

  it('does nothing for an empty list', () => {
    revalidatePublicPaths([]);

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('keeps going when one revalidation throws', () => {
    mockRevalidatePath.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() => revalidatePublicPaths(['/brad/a', '/brad/b'])).not.toThrow();
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it('lookupPublicPaths returns the lookup result or an empty list on failure', async () => {
    expect(await lookupPublicPaths(async () => ['/brad/a'])).toEqual(['/brad/a']);
    expect(await lookupPublicPaths(async () => Promise.reject(new Error('db')))).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('revalidateAfterWrite unions the before paths with the lookup and never throws', async () => {
    await revalidateAfterWrite(['/brad/old'], async () => ['/brad/new', '/brad/old']);
    expect(revalidated()).toEqual(['/brad/old', '/brad/new']);

    mockRevalidatePath.mockClear();
    await expect(
      revalidateAfterWrite(['/brad/old'], async () => Promise.reject(new Error('db')))
    ).resolves.toBeUndefined();
    expect(revalidated()).toEqual(['/brad/old']);
  });
});
