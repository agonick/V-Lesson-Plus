const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePlaybackRate,
  getFirstVjsTechElement,
  applyPlaybackRateToDocument,
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