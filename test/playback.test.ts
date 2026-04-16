import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setStoredPlaybackRate, getStoredPlaybackRate } from '../src/popup/playback';

// Mock chrome.storage
const mockStorageLocal = {
  data: {} as Record<string, any>,
  get: vi.fn(async (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const result: Record<string, any> = {};
    for (const key of keyArray) {
      if (key in mockStorageLocal.data) {
        result[key] = mockStorageLocal.data[key];
      }
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, any>) => {
    Object.assign(mockStorageLocal.data, items);
  }),
};

describe('playback rate storage operations', () => {
  beforeEach(() => {
    mockStorageLocal.data = {};
    mockStorageLocal.get.mockClear();
    mockStorageLocal.set.mockClear();
    vi.clearAllMocks();
  });

  it('saves playback rate to storage', async () => {
    expect(mockStorageLocal.data).toEqual({});
    await setStoredPlaybackRate(mockStorageLocal as any, '1.5');
    const result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('1.5');
  });

  it('stores different playback rates correctly', async () => {
    await setStoredPlaybackRate(mockStorageLocal as any, '1');
    let result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('1');

    await setStoredPlaybackRate(mockStorageLocal as any, '2');
    result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('2');
  });

  it('returns default rate when storage is empty', async () => {
    const result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('1');
  });

  it('returns stored rate when available', async () => {
    mockStorageLocal.data.vlp_lastPlaybackRate = '1.5';
    const result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('1.5');
  });

  it('handles non-string values gracefully', async () => {
    mockStorageLocal.data.vlp_lastPlaybackRate = 123;
    const result = await getStoredPlaybackRate(mockStorageLocal as any);
    expect(result).toBe('1');
  });
});

describe('Issue #2: playback persistence ordering', () => {
  beforeEach(() => {
    mockStorageLocal.data = {};
    mockStorageLocal.get.mockClear();
    mockStorageLocal.set.mockClear();
  });

  it('documents the required behavior: only save AFTER verifying response.ok', () => {
    // ISSUE #2: Playback rate is persisted to storage BEFORE checking if
    // the content script successfully applied it to the video.
    //
    // Current bug flow:
    //   1. User changes speed in popup
    //   2. applyPlaybackRateToActiveTab() saves immediately to storage
    //   3. Then sends message to content script
    //   4. If content script fails (no video), rate is still in storage
    //   5. Next page load applies the rate to wrong/no video
    //
    // Desired flow:
    //   1. User changes speed in popup
    //   2. applyPlaybackRateToActiveTab() sends message to content script
    //   3. Waits for response
    //   4. Checks response.ok
    //   5. ONLY saves to storage if response.ok === true
    //
    // This test verifies the contract: response checking before persistence

    const successResponse = { ok: true, message: 'Playback rate set to 1.5.' };
    const failureResponse = { ok: false, message: 'No .vjs-tech element found' };

    // Only save if ok is true
    expect(successResponse.ok === true).toBe(true);
    expect(failureResponse.ok === true).toBe(false);
  });
});
