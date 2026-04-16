import { describe, it, expect } from 'vitest';
import {
  ensureVideoElement,
  MARKERS_STORAGE_KEY,
  normalizePlaybackRate,
  getFirstVjsTechElement,
  applyPlaybackRateToDocument,
  normalizeLessonUrl,
  formatMarkerTime,
  validateMarkerLabel,
  getStoredMarkersForUrl,
} from '../src/logic';

describe('ensureVideoElement', () => {
  it('returns the video element if found', () => {
    const video = { playbackRate: 1 };
    const documentLike = {
      getElementsByClassName(className: string) {
        expect(className).toBe('vjs-tech');
        return [video] as any[];
      },
    } as unknown as Document;

    const result = ensureVideoElement(documentLike);
    expect(result).toBe(video);
  });

  it('returns null if video element is not found', () => {
    const documentLike = {
      getElementsByClassName() {
        return [] as any[];
      },
    } as unknown as Document;

    const result = ensureVideoElement(documentLike);
    expect(result).toBeNull();
  });

  it('reflects current DOM state on each call (not cached)', () => {
    let videoInDom: any | null = null;

    const documentLike = {
      getElementsByClassName() {
        return videoInDom ? [videoInDom] : [];
      },
    } as unknown as Document;

    // First call: no video
    expect(ensureVideoElement(documentLike)).toBeNull();

    // DOM updated
    videoInDom = { playbackRate: 1 };

    // Second call: video should be found
    expect(ensureVideoElement(documentLike)).toBe(videoInDom);

    // DOM cleared
    videoInDom = null;

    // Third call: video should be gone
    expect(ensureVideoElement(documentLike)).toBeNull();
  });
});

describe('normalizePlaybackRate', () => {
  it('accepts allowed numeric values', () => {
    expect(normalizePlaybackRate('1')).toBe(1);
    expect(normalizePlaybackRate('1.5')).toBe(1.5);
    expect(normalizePlaybackRate('2')).toBe(2);
  });

  it('accepts comma decimals', () => {
    expect(normalizePlaybackRate('1,5')).toBe(1.5);
  });

  it('rejects unsupported values', () => {
    expect(normalizePlaybackRate('0.5')).toBeNull();
    expect(normalizePlaybackRate('abc')).toBeNull();
    expect(normalizePlaybackRate('')).toBeNull();
  });
});

describe('getFirstVjsTechElement', () => {
  it('returns the first matching element', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    const documentLike = {
      getElementsByClassName(className: string) {
        expect(className).toBe('vjs-tech');
        return [first, second] as any[];
      },
    } as unknown as Document;

    expect(getFirstVjsTechElement(documentLike)).toBe(first);
  });
});

describe('applyPlaybackRateToDocument', () => {
  it('updates the first matching element', () => {
    const video = { playbackRate: 1 };
    const documentLike = {
      getElementsByClassName(className: string) {
        expect(className).toBe('vjs-tech');
        return [video] as any[];
      },
    } as unknown as Document;

    const result = applyPlaybackRateToDocument(documentLike, 1.5);

    expect(result).toEqual({ ok: true, message: 'Playback rate set to 1.5.' });
    expect(video.playbackRate).toBe(1.5);
  });

  it('reports when no matching element exists', () => {
    const documentLike = {
      getElementsByClassName() {
        return [] as any[];
      },
    } as unknown as Document;

    const result = applyPlaybackRateToDocument(documentLike, 2);
    expect(result).toEqual({
      ok: false,
      message: 'No .vjs-tech element found on this page.',
    });
  });
});

describe('normalizeLessonUrl', () => {
  it('removes the hash but keeps the lesson URL', () => {
    expect(
      normalizeLessonUrl('https://example.com/lesson?id=42#marker'),
    ).toBe('https://example.com/lesson?id=42');
  });

  it('returns the original value for invalid URLs', () => {
    expect(normalizeLessonUrl('/relative/path')).toBe('/relative/path');
  });
});

describe('formatMarkerTime', () => {
  it('formats marker timestamps correctly', () => {
    expect(formatMarkerTime(5)).toBe('0:05');
    expect(formatMarkerTime(65.9)).toBe('1:05');
    expect(formatMarkerTime(3665)).toBe('1:01:05');
  });
});

describe('validateMarkerLabel', () => {
  it('accepts safe labels', () => {
    expect(validateMarkerLabel('Intro - Part 1')).toBe('Intro - Part 1');
    expect(validateMarkerLabel('Lesson, recap.')).toBe('Lesson, recap.');
    expect(validateMarkerLabel('1st marker')).toBe('1st marker');
  });

  it('trims and rejects unsafe labels', () => {
    expect(validateMarkerLabel('  Study note  ')).toBe('Study note');
    expect(validateMarkerLabel('')).toBe('');
    expect(validateMarkerLabel('<script>alert(1)</script>')).toBeNull();
    expect(validateMarkerLabel('name_01')).toBeNull();
  });
});
