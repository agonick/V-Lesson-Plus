import {
  formatMarkerTime,
  MARKERS_STORAGE_KEY,
  normalizeLessonUrl,
  validateMarkerLabel,
  type Marker,
  type MarkerStore,
} from "../logic";
import type { DeleteHandler, JumpHandler, TranslateFn } from "./types";

export function isMarker(value: unknown): value is Marker {
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

export function createMarkerId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function getMarkerStore(
  storage: chrome.storage.StorageArea,
): Promise<MarkerStore> {
  const result = (await storage.get(MARKERS_STORAGE_KEY)) as Record<
    string,
    unknown
  >;
  const storedMarkers = result[MARKERS_STORAGE_KEY];

  if (
    typeof storedMarkers !== "object" ||
    storedMarkers === null ||
    Array.isArray(storedMarkers)
  ) {
    return {};
  }

  const store: MarkerStore = {};

  for (const [url, markers] of Object.entries(
    storedMarkers as Record<string, unknown>,
  )) {
    if (!Array.isArray(markers)) {
      continue;
    }

    const validMarkers = markers.filter(isMarker);
    if (validMarkers.length > 0) {
      store[url] = validMarkers;
    }
  }

  return store;
}

export async function setMarkerStore(
  storage: chrome.storage.StorageArea,
  store: MarkerStore,
): Promise<void> {
  await storage.set({ [MARKERS_STORAGE_KEY]: store });
}

export function getMarkersForUrl(store: MarkerStore, url: string): Marker[] {
  const normalizedUrl = normalizeLessonUrl(url);
  const markers = store[normalizedUrl];

  if (!Array.isArray(markers)) {
    return [];
  }

  return markers.filter(isMarker);
}

function createMarkerLabelElement(label: string): HTMLSpanElement {
  const markerLabelElement = document.createElement("span");
  markerLabelElement.className = "marker-label";
  markerLabelElement.textContent = label;
  return markerLabelElement;
}

export function renderMarkersList(
  markers: Marker[],
  markersList: HTMLUListElement,
  markersEmpty: HTMLElement,
  onJump: JumpHandler,
  onDelete: DeleteHandler,
  t: TranslateFn,
  onError: (message: string) => void,
): void {
  markersList.replaceChildren();

  if (markers.length === 0) {
    markersEmpty.classList.remove("hidden");
    return;
  }

  markersEmpty.classList.add("hidden");

  for (const marker of markers) {
    const item = document.createElement("li");
    item.className = "marker-item";

    const jumpButton = document.createElement("button");
    jumpButton.type = "button";
    jumpButton.className = "marker-jump";
    jumpButton.textContent = formatMarkerTime(marker.time);
    jumpButton.addEventListener("click", () => {
      try {
        onJump(marker);
      } catch (error) {
        onError(`${t("errorPrefix")}: ${(error as Error).message}`);
      }
    });

    const meta = document.createElement("div");
    meta.className = "marker-meta";
    if (marker.label) {
      meta.append(createMarkerLabelElement(marker.label));
    }

    const savedAt = document.createElement("span");
    savedAt.textContent = t("markerSavedAt", {
      time: formatMarkerTime(marker.time),
    });
    meta.append(savedAt);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "marker-delete";
    deleteButton.textContent = t("markerDelete");
    deleteButton.addEventListener("click", () => {
      try {
        onDelete(marker.id);
      } catch (error) {
        onError(`${t("errorPrefix")}: ${(error as Error).message}`);
      }
    });

    const actions = document.createElement("div");
    actions.className = "marker-actions";
    actions.append(jumpButton, deleteButton);

    item.append(meta, actions);
    markersList.append(item);
  }
}
