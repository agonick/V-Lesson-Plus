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

/**
 * Ensure by fetching the video element every time (not cached).
 * This is the preferred way to get the video reference in dynamic contexts
 * where the player may be initialized asynchronously.
 *
 * @param documentLike - Document context (real or test double)
 * @returns The video element or null if not found
 */
export function ensureVideoElement(
  documentLike: Document | DocumentLike,
): HTMLMediaElement | null {
  return getFirstVjsTechElement(documentLike);
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

function isMarker(value: unknown): value is Marker {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.time === "number" &&
    typeof candidate.createdAt === "number" &&
    (candidate.label === undefined ||
      validateMarkerLabel(String(candidate.label)) !== null)
  );
}

export async function getStoredMarkersForUrl(
  normalizedUrl: string,
): Promise<Marker[]> {
  try {
    const result = (await chrome.storage.local.get(
      MARKERS_STORAGE_KEY,
    )) as Record<string, unknown>;

    const store = result[MARKERS_STORAGE_KEY];

    if (typeof store !== "object" || store === null || Array.isArray(store)) {
      return [];
    }

    const markers = (store as Record<string, unknown>)[normalizedUrl];

    if (!Array.isArray(markers)) {
      return [];
    }

    return markers.filter(isMarker);
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to load markers from storage:", error);
    return [];
  }
}

export function renderTimelineMarkers(
  documentLike: Document | DocumentLike,
  video: HTMLMediaElement,
  markers: Marker[],
): void {
  const progressHolder = documentLike.querySelector(
    ".vjs-progress-holder",
  ) as HTMLElement | null;

  if (!progressHolder) {
    console.log("[V-Lesson Plus] No .vjs-progress-holder found");
    return;
  }

  // Clear existing markers
  const existingMarkers = progressHolder.querySelectorAll(
    ".vlp-timeline-marker",
  );
  existingMarkers.forEach((marker) => marker.remove());

  // If no markers or video duration unknown, return early
  if (
    markers.length === 0 ||
    !video.duration ||
    !Number.isFinite(video.duration)
  ) {
    return;
  }

  // Create and position each marker
  for (const marker of markers) {
    const markerElement = documentLike.createElement("div");
    markerElement.className = "vlp-timeline-marker";
    markerElement.style.position = "absolute";
    markerElement.style.top = "50%";
    markerElement.style.transform = "translate(-50%, -50%)";
    markerElement.style.height = "12px";
    markerElement.style.width = "2px";
    markerElement.style.background = "#3b82f6";
    markerElement.style.borderRadius = "1px";
    markerElement.style.cursor = "pointer";
    markerElement.style.transition = "background 120ms ease-in-out";
    markerElement.style.zIndex = "1";

    const clampedTime = Math.max(0, Math.min(marker.time, video.duration));
    const percentagePosition = (clampedTime / video.duration) * 100;
    markerElement.style.left = `${percentagePosition}%`;

    // Keep markers visible at both edges instead of being cut off by translateX(-50%).
    if (percentagePosition <= 0.01) {
      markerElement.style.transform = "translate(0, -50%)";
    } else if (percentagePosition >= 99.99) {
      markerElement.style.transform = "translate(-100%, -50%)";
    }

    // Tooltip
    if (marker.label) {
      const tooltip = documentLike.createElement("div");
      tooltip.className = "vlp-marker-tooltip";
      tooltip.textContent = marker.label;
      tooltip.style.position = "absolute";
      tooltip.style.bottom = "100%";
      tooltip.style.left = "50%";
      tooltip.style.transform = "translateX(-50%)";
      tooltip.style.marginBottom = "6px";
      tooltip.style.padding = "4px 8px";
      tooltip.style.background = "#1f2937";
      tooltip.style.color = "#fff";
      tooltip.style.fontSize = "11px";
      tooltip.style.borderRadius = "4px";
      tooltip.style.whiteSpace = "nowrap";
      tooltip.style.pointerEvents = "none";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 120ms ease-in-out";
      tooltip.style.zIndex = "10";

      // Add arrow
      const arrow = documentLike.createElement("div");
      arrow.style.position = "absolute";
      arrow.style.top = "100%";
      arrow.style.left = "50%";
      arrow.style.transform = "translateX(-50%)";
      arrow.style.width = "0";
      arrow.style.height = "0";
      arrow.style.borderLeft = "3px solid transparent";
      arrow.style.borderRight = "3px solid transparent";
      arrow.style.borderTop = "3px solid #1f2937";
      tooltip.appendChild(arrow);

      markerElement.appendChild(tooltip);

      // Hover handlers
      markerElement.addEventListener("mouseenter", () => {
        tooltip.style.opacity = "1";
        markerElement.style.background = "#2563eb";
      });

      markerElement.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
        markerElement.style.background = "#3b82f6";
      });
    }

    progressHolder.appendChild(markerElement);
  }
}

interface DocumentLike {
  getElementsByClassName(className: string): any[];
  createElement(tagName: string): HTMLElement;
  querySelector(selector: string): Element | null;
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
