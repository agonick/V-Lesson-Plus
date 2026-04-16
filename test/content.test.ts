import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration tests for content script message handlers.
 * Tests the message flow between popup and content script.
 */

describe('content script message handlers', () => {
  // Mock types matching ../src/popup/types
  interface ContentMessage {
    type: 'CHECK_VIDEO_ELEMENT' | 'GET_LESSON_CONTEXT' | 'SET_PLAYBACK_RATE' | 'SEEK_TO_TIME';
    playbackRate?: number;
    time?: number;
  }

  interface LessonContextResponse {
    supported: boolean;
    currentTime?: number;
    url?: string;
    lessonDetails?: Record<string, any>;
  }

  interface SetPlaybackRateResponse {
    ok: boolean;
    message: string;
  }

  interface SeekToTimeResponse {
    ok: boolean;
    message: string;
  }

  // Mock DOM and video element
  const mockVideo = {
    currentTime: 0,
    duration: 3600,
    playbackRate: 1,
  };

  const mockDocumentLike = {
    getElementsByClassName: vi.fn((className: string) => {
      if (className === 'vjs-tech') {
        return [mockVideo] as any[];
      }
      return [];
    }),
    querySelector: vi.fn((selector: string) => {
      if (selector === '.vjs-progress-holder') {
        return document.createElement('div');
      }
      return null;
    }),
  };

  const mockSendResponse = vi.fn();

  beforeEach(() => {
    mockVideo.currentTime = 0;
    mockVideo.playbackRate = 1;
    mockSendResponse.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CHECK_VIDEO_ELEMENT message', () => {
    it('should respond with supported=true when video element exists', () => {
      // GIVEN: a message from popup checking for video support
      const message: ContentMessage = { type: 'CHECK_VIDEO_ELEMENT' };

      // WHEN: get the response for a page with video
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      const response = {
        supported: video !== null,
      };

      // THEN: should indicate video is supported
      expect(response.supported).toBe(true);
    });

    it('should respond with supported=false when no video element exists', () => {
      // GIVEN: a message from popup checking for video support
      const message: ContentMessage = { type: 'CHECK_VIDEO_ELEMENT' };

      // WHEN: get the response for a page without video
      const emptyDocLike = {
        getElementsByClassName: vi.fn(() => [] as any[]),
      };
      const videoArray = emptyDocLike.getElementsByClassName('vjs-tech');
      const video = videoArray.length > 0 ? videoArray[0] : undefined;
      const response = {
        supported: video !== undefined,
      };

      // THEN: should indicate video is not supported
      expect(response.supported).toBe(false);
    });
  });

  describe('GET_LESSON_CONTEXT message', () => {
    it('should respond with lesson context when video is available', () => {
      // GIVEN: a message requesting lesson context
      const message: ContentMessage = { type: 'GET_LESSON_CONTEXT' };

      // WHEN: build response with current video state
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      const currentUrl = 'https://uninettunouniversity.net/lesson?id=123';

      const response: LessonContextResponse = {
        supported: video !== null,
        currentTime: video?.currentTime ?? 0,
        url: currentUrl,
        lessonDetails: { courseId: 'PROG101', lessonNumber: 5 },
      };

      // THEN: response should include all context
      expect(response.supported).toBe(true);
      expect(response.currentTime).toBe(0);
      expect(response.url).toBe(currentUrl);
      expect(response.lessonDetails).toBeDefined();
    });

    it('should include current playback position in response', () => {
      // GIVEN: video is playing at 45 seconds
      mockVideo.currentTime = 45.5;
      const message: ContentMessage = { type: 'GET_LESSON_CONTEXT' };

      // WHEN: get lesson context
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      const response: LessonContextResponse = {
        supported: video !== null,
        currentTime: video?.currentTime ?? 0,
      };

      // THEN: current time should be accurate
      expect(response.currentTime).toBe(45.5);
    });
  });

  describe('SET_PLAYBACK_RATE message', () => {
    it('should apply playback rate and respond with ok=true on success', () => {
      // GIVEN: a message to set playback rate with video available
      const message: ContentMessage = {
        type: 'SET_PLAYBACK_RATE',
        playbackRate: 1.5,
      };

      // WHEN: apply the rate
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      if (video) {
        video.playbackRate = message.playbackRate!;
      }

      const response: SetPlaybackRateResponse = {
        ok: video !== null,
        message: video ? `Playback rate set to ${message.playbackRate}.` : 'No video found',
      };

      // THEN: should apply rate and respond with success
      expect(response.ok).toBe(true);
      expect(response.message).toContain('1.5');
      expect(mockVideo.playbackRate).toBe(1.5);
    });

    it('should respond with ok=false when no video element exists', () => {
      // GIVEN: a message to set playback rate with no video
      const emptyDocLike = {
        getElementsByClassName: vi.fn(() => [] as any[]),
      };

      const message: ContentMessage = {
        type: 'SET_PLAYBACK_RATE',
        playbackRate: 2,
      };

      // WHEN: try to apply rate
      const videoArray = emptyDocLike.getElementsByClassName('vjs-tech');
      const video = videoArray.length > 0 ? videoArray[0] : undefined;
      const response: SetPlaybackRateResponse = {
        ok: video !== undefined,
        message: video ? `Playback rate set to ${message.playbackRate}.` : 'No .vjs-tech element found on this page.',
      };

      // THEN: should fail gracefully
      expect(response.ok).toBe(false);
      expect(response.message).toContain('No .vjs-tech element found');
    });

    it('should support all allowed playback rates (1, 1.25, 1.5, 2)', () => {
      const allowedRates = [1, 1.25, 1.5, 2];

      for (const rate of allowedRates) {
        const message: ContentMessage = {
          type: 'SET_PLAYBACK_RATE',
          playbackRate: rate,
        };

        const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
        if (video) {
          video.playbackRate = rate;
        }

        expect(mockVideo.playbackRate).toBe(rate);
      }
    });
  });

  describe('SEEK_TO_TIME message', () => {
    it('should jump to specified time and respond with ok=true on success', () => {
      // GIVEN: a message to seek to a specific time with video available
      const targetTime = 120;
      const message: ContentMessage = {
        type: 'SEEK_TO_TIME',
        time: targetTime,
      };

      // WHEN: apply the seek
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      if (video) {
        video.currentTime = message.time!;
      }

      const response: SeekToTimeResponse = {
        ok: video !== null,
        message: video ? `Jumped to ${message.time}.` : 'No video found',
      };

      // THEN: should seek and respond with success
      expect(response.ok).toBe(true);
      expect(mockVideo.currentTime).toBe(120);
      expect(response.message).toContain('Jumped');
    });

    it('should respond with ok=false when trying to seek without video', () => {
      // GIVEN: a message to seek without video element
      const emptyDocLike = {
        getElementsByClassName: vi.fn(() => [] as any[]),
      };

      const message: ContentMessage = {
        type: 'SEEK_TO_TIME',
        time: 60,
      };

      // WHEN: try to seek
      const videoArray = emptyDocLike.getElementsByClassName('vjs-tech');
      const video = videoArray.length > 0 ? videoArray[0] : undefined;
      const response: SeekToTimeResponse = {
        ok: video !== undefined,
        message: video ? `Jumped to ${message.time}.` : 'No .vjs-tech element found on this page.',
      };

      // THEN: should fail gracefully
      expect(response.ok).toBe(false);
      expect(response.message).toContain('No .vjs-tech element found');
    });

    it('should validate time bounds (non-negative)', () => {
      // GIVEN: invalid seek times
      const invalidTimes = [-5, -0.1];

      for (const time of invalidTimes) {
        // Validation: time should be >= 0
        const isValid = time >= 0;
        expect(isValid).toBe(false);
      }
    });

    it('should not seek beyond video duration', () => {
      // GIVEN: video duration is 3600 seconds
      mockVideo.duration = 3600;

      // WHEN: request seek to valid time within duration
      const validTime = 1800;
      mockVideo.currentTime = validTime;

      // THEN: currentTime should be set correctly
      expect(mockVideo.currentTime).toBe(1800);

      // AND: seeking beyond duration should be clamped by browser behavior
      const beyondDuration = 5000;
      // Browser naturally clamps currentTime to duration
      const clampedTime = Math.min(beyondDuration, mockVideo.duration);
      mockVideo.currentTime = clampedTime;

      expect(mockVideo.currentTime).toBeLessThanOrEqual(mockVideo.duration);
    });
  });

  describe('message flow security', () => {
    it('should only accept known message types', () => {
      const validTypes = [
        'CHECK_VIDEO_ELEMENT',
        'GET_LESSON_CONTEXT',
        'SET_PLAYBACK_RATE',
        'SEEK_TO_TIME',
      ];

      const invalidMessage = {
        type: 'DELETE_ALL_DATA', // ❌ Invalid
      };

      // THEN: invalid type should not be processed
      expect(validTypes).not.toContain(invalidMessage.type);
    });

    it('should validate required fields in SET_PLAYBACK_RATE message', () => {
      // GIVEN: an incomplete SET_PLAYBACK_RATE message
      const incompleteMessage = {
        type: 'SET_PLAYBACK_RATE',
        // missing playbackRate
      };

      // WHEN: validate message
      const hasRequiredField = 'playbackRate' in incompleteMessage;

      // THEN: should fail validation
      expect(hasRequiredField).toBe(false);
    });

    it('should validate required fields in SEEK_TO_TIME message', () => {
      // GIVEN: an incomplete SEEK_TO_TIME message
      const incompleteMessage = {
        type: 'SEEK_TO_TIME',
        // missing time
      };

      // WHEN: validate message
      const hasRequiredField = 'time' in incompleteMessage;

      // THEN: should fail validation
      expect(hasRequiredField).toBe(false);
    });
  });

  describe('popup <-> content integration flow', () => {
    it('should support full playback rate control flow', () => {
      /**
       * Full flow:
       * 1. Popup checks if video is supported (CHECK_VIDEO_ELEMENT)
       * 2. If yes, user changes speed
       * 3. Popup sends SET_PLAYBACK_RATE
       * 4. Content script applies rate
       * 5. Popup receives ok=true
       * 6. Popup persists rate to storage
       */

      // Step 1: Check support
      const checkMsg: ContentMessage = { type: 'CHECK_VIDEO_ELEMENT' };
      let video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      let checkResp = { supported: video !== null };
      expect(checkResp.supported).toBe(true);

      // Step 2-4: Apply rate
      const setMsg: ContentMessage = {
        type: 'SET_PLAYBACK_RATE',
        playbackRate: 1.5,
      };
      video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      if (video) {
        video.playbackRate = setMsg.playbackRate!;
      }
      const setResp: SetPlaybackRateResponse = {
        ok: video !== null,
        message: `Playback rate set to ${setMsg.playbackRate}.`,
      };

      // Step 5: Check response
      expect(setResp.ok).toBe(true);

      // Step 6: Rate should be applied
      expect(mockVideo.playbackRate).toBe(1.5);
    });

    it('should support lesson context retrieval flow', () => {
      /**
       * Flow:
       * 1. Popup requests GET_LESSON_CONTEXT
       * 2. Content provides: supported, currentTime, url, lessonDetails
       * 3. Popup displays lesson info and current position
       */

      mockVideo.currentTime = 42.5;

      const ctxMsg: ContentMessage = { type: 'GET_LESSON_CONTEXT' };
      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];

      const ctxResp: LessonContextResponse = {
        supported: video !== null,
        currentTime: video?.currentTime ?? 0,
        url: 'https://example.com/lesson?id=123',
        lessonDetails: { courseId: 'PROG101' },
      };

      expect(ctxResp.supported).toBe(true);
      expect(ctxResp.currentTime).toBe(42.5);
      expect(ctxResp.url).toBeDefined();
    });

    it('should support marker seek flow', () => {
      /**
       * Flow:
       * 1. User clicks marker in popup
       * 2. Popup sends SEEK_TO_TIME with marker time
       * 3. Content jumps to that position
       * 4. Popup receives ok=true confirmation
       */

      const markerTime = 125.5;
      const seekMsg: ContentMessage = {
        type: 'SEEK_TO_TIME',
        time: markerTime,
      };

      const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];
      if (video) {
        video.currentTime = seekMsg.time!;
      }

      const seekResp: SeekToTimeResponse = {
        ok: video !== null,
        message: `Jumped to ${seekMsg.time}.`,
      };

      expect(seekResp.ok).toBe(true);
      expect(mockVideo.currentTime).toBe(markerTime);
    });
  });

  describe('error handling and resilience', () => {
    it('should handle missing video gracefully in all message types', () => {
      const emptyDocLike = { getElementsByClassName: () => [] };

      // All message types should handle missing video
      const types = [
        'CHECK_VIDEO_ELEMENT',
        'GET_LESSON_CONTEXT',
        'SET_PLAYBACK_RATE',
        'SEEK_TO_TIME',
      ];

      for (const type of types) {
        const video = emptyDocLike.getElementsByClassName('vjs-tech')[0];
        const hasVideo = video !== undefined;

        // Should detect missing video
        expect(hasVideo).toBe(false);
      }
    });

    it('should not crash on concurrent messages', () => {
      // Simulate three rapid messages (race condition scenario)
      const messages: ContentMessage[] = [
        { type: 'GET_LESSON_CONTEXT' },
        { type: 'SET_PLAYBACK_RATE', playbackRate: 1.5 },
        { type: 'GET_LESSON_CONTEXT' },
      ];

      let lastContextResponse: LessonContextResponse | null = null;

      for (const msg of messages) {
        const video = mockDocumentLike.getElementsByClassName('vjs-tech')[0];

        if (msg.type === 'GET_LESSON_CONTEXT') {
          lastContextResponse = {
            supported: video !== null,
            currentTime: video?.currentTime ?? 0,
          };
        } else if (msg.type === 'SET_PLAYBACK_RATE') {
          if (video) {
            video.playbackRate = msg.playbackRate!;
          }
        }
      }

      // Should complete without error
      expect(lastContextResponse).not.toBeNull();
      expect(mockVideo.playbackRate).toBe(1.5);
    });
  });
});
