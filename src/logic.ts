const ALLOWED_PLAYBACK_RATES = [1, 1.25, 1.5, 2];

export function normalizePlaybackRate(value: string | number): number | null {
  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;
  const playbackRate = Number(normalizedValue);

  if (
    !Number.isFinite(playbackRate) ||
    !ALLOWED_PLAYBACK_RATES.includes(playbackRate)
  ) {
    return null;
  }

  return playbackRate;
}

export function getFirstVjsTechElement(
  documentLike: Document | DocumentLike,
): HTMLMediaElement | null {
  const elements = documentLike.getElementsByClassName("vjs-tech");
  return (elements[0] as HTMLMediaElement) ?? null;
}

interface ApplyResult {
  ok: boolean;
  message: string;
}

export function applyPlaybackRateToDocument(
  documentLike: Document | DocumentLike,
  playbackRate: number,
): ApplyResult {
  const video = getFirstVjsTechElement(documentLike);

  if (!video) {
    return { ok: false, message: "No .vjs-tech element found on this page." };
  }

  (video as any).playbackRate = playbackRate;
  return { ok: true, message: `Playback rate set to ${playbackRate}.` };
}

interface DocumentLike {
  getElementsByClassName(className: string): any[];
}

// For browser compatibility, export as global for popup.html script tag loading
if (typeof window !== "undefined") {
  (window as any).VLessonPlusLogic = {
    normalizePlaybackRate,
    getFirstVjsTechElement,
    applyPlaybackRateToDocument,
  };
}
