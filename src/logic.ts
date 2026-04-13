const ALLOWED_PLAYBACK_RATES = [1, 1.25, 1.5, 2];

export const MARKERS_STORAGE_KEY = "vlp_markers";

export interface Marker {
  id: string;
  time: number;
  createdAt: number;
  label?: string;
}

export interface MarkerStore {
  [normalizedUrl: string]: Marker[];
}

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

export function normalizeLessonUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
}

export function formatMarkerTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const paddedSeconds = String(remainingSeconds).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function validateMarkerLabel(value: string): string | null {
  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return "";
  }

  if (trimmedValue.length > 80) {
    return null;
  }

  const labelPattern = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,-]*$/u;

  if (!labelPattern.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
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
    normalizeLessonUrl,
    formatMarkerTime,
  };
}
