const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MARKERS_STORAGE_KEY,
  normalizePlaybackRate,
  getFirstVjsTechElement,
  applyPlaybackRateToDocument,
  normalizeLessonUrl,
  formatMarkerTime,
  validateMarkerLabel,
  getStoredMarkersForUrl,
} = require('../dist/logic.js');

test('normalizePlaybackRate accepts allowed numeric values', () => {
  assert.equal(normalizePlaybackRate('1'), 1);
  assert.equal(normalizePlaybackRate('1.5'), 1.5);
  assert.equal(normalizePlaybackRate('2'), 2);
});

test('normalizePlaybackRate accepts comma decimals', () => {
  assert.equal(normalizePlaybackRate('1,5'), 1.5);
});

test('normalizePlaybackRate rejects unsupported values', () => {
  assert.equal(normalizePlaybackRate('0.5'), null);
  assert.equal(normalizePlaybackRate('abc'), null);
  assert.equal(normalizePlaybackRate(''), null);
});

test('getFirstVjsTechElement returns the first matching element', () => {
  const first = { id: 'first' };
  const second = { id: 'second' };
  const documentLike = {
    getElementsByClassName(className) {
      assert.equal(className, 'vjs-tech');
      return [first, second];
    },
  };

  assert.equal(getFirstVjsTechElement(documentLike), first);
});

test('applyPlaybackRateToDocument updates the first matching element', () => {
  const video = { playbackRate: 1 };
  const documentLike = {
    getElementsByClassName(className) {
      assert.equal(className, 'vjs-tech');
      return [video];
    },
  };

  const result = applyPlaybackRateToDocument(documentLike, 1.5);

  assert.deepEqual(result, { ok: true, message: 'Playback rate set to 1.5.' });
  assert.equal(video.playbackRate, 1.5);
});

test('applyPlaybackRateToDocument reports when no matching element exists', () => {
  const documentLike = {
    getElementsByClassName() {
      return [];
    },
  };

  assert.deepEqual(applyPlaybackRateToDocument(documentLike, 2), {
    ok: false,
    message: 'No .vjs-tech element found on this page.',
  });
});

test('normalizeLessonUrl removes the hash but keeps the lesson URL', () => {
  assert.equal(
    normalizeLessonUrl('https://example.com/lesson?id=42#marker'),
    'https://example.com/lesson?id=42',
  );
});

test('normalizeLessonUrl returns the original value for invalid URLs', () => {
  assert.equal(normalizeLessonUrl('/relative/path'), '/relative/path');
});

test('formatMarkerTime formats marker timestamps', () => {
  assert.equal(formatMarkerTime(5), '0:05');
  assert.equal(formatMarkerTime(65.9), '1:05');
  assert.equal(formatMarkerTime(3665), '1:01:05');
});

test('validateMarkerLabel accepts safe labels', () => {
  assert.equal(validateMarkerLabel('Intro - Part 1'), 'Intro - Part 1');
  assert.equal(validateMarkerLabel('Lesson, recap.'), 'Lesson, recap.');
  assert.equal(validateMarkerLabel('1st marker'), '1st marker');
});

test('validateMarkerLabel trims and rejects unsafe labels', () => {
  assert.equal(validateMarkerLabel('  Study note  '), 'Study note');
  assert.equal(validateMarkerLabel(''), '');
  assert.equal(validateMarkerLabel('<script>alert(1)</script>'), null);
  assert.equal(validateMarkerLabel('name_01'), null);
});

test('validateMarkerLabel rejects labels longer than 80 chars', () => {
  const overLimit = 'a'.repeat(81);
  assert.equal(validateMarkerLabel(overLimit), null);
});

test('getStoredMarkersForUrl returns only valid markers for a lesson', async () => {
  const normalizedUrl = 'https://example.com/lesson?id=42';
  const validMarker = {
    id: 'm1',
    time: 15,
    createdAt: 1700000000000,
    label: 'Intro',
  };
  const invalidMarker = {
    id: 'm2',
    time: 30,
    createdAt: 1700000000001,
    label: '<bad>',
  };

  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          assert.equal(key, MARKERS_STORAGE_KEY);
          return {
            [MARKERS_STORAGE_KEY]: {
              [normalizedUrl]: [validMarker, invalidMarker, null],
            },
          };
        },
      },
    },
  };

  try {
    const markers = await getStoredMarkersForUrl(normalizedUrl);
    assert.deepEqual(markers, [validMarker]);
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('getStoredMarkersForUrl returns empty list for malformed storage payload', async () => {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          return { [MARKERS_STORAGE_KEY]: 'invalid-store' };
        },
      },
    },
  };

  try {
    const markers = await getStoredMarkersForUrl('https://example.com/lesson');
    assert.deepEqual(markers, []);
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('getStoredMarkersForUrl returns empty list when storage throws', async () => {
  const originalChrome = globalThis.chrome;
  const originalConsoleLog = console.log;
  console.log = () => {};
  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          throw new Error('storage failure');
        },
      },
    },
  };

  try {
    const markers = await getStoredMarkersForUrl('https://example.com/lesson');
    assert.deepEqual(markers, []);
  } finally {
    globalThis.chrome = originalChrome;
    console.log = originalConsoleLog;
  }
});