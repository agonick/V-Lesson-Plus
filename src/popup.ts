import {
  formatMarkerTime,
  MARKERS_STORAGE_KEY,
  normalizeLessonUrl,
  normalizePlaybackRate,
  validateMarkerLabel,
  type Marker,
  type MarkerStore,
} from "./logic";

interface StatusElement extends HTMLElement {}
interface MarkerListElement extends HTMLUListElement {}
interface MarkerButtonElement extends HTMLButtonElement {}
interface MarkerLabelInputElement extends HTMLInputElement {}

interface LessonDetails {
  courseId: string | null;
  courseName: string | null;
  professorName: string | null;
  lessonNumber: string | null;
  lessonName: string | null;
}

interface LessonContextResponse {
  supported: boolean;
  currentTime: number;
  url: string;
  lessonDetails: LessonDetails;
}

interface SetPlaybackRateResponse {
  ok: boolean;
  message: string;
}

interface SeekToTimeResponse {
  ok: boolean;
  message: string;
}

const playbackRateSelect = document.getElementById(
  "playbackRateSelect",
) as HTMLSelectElement;
const status = document.getElementById("status") as StatusElement;
const supportedSection = document.getElementById(
  "supportedSection",
) as HTMLDivElement;
const notSupportedSection = document.getElementById(
  "notSupportedSection",
) as HTMLDivElement;
const saveMarkerButton = document.getElementById(
  "saveMarkerButton",
) as MarkerButtonElement;
const markerLabelInput = document.getElementById(
  "markerLabelInput",
) as MarkerLabelInputElement;
const markersList = document.getElementById("markersList") as MarkerListElement;
const markersEmpty = document.getElementById("markersEmpty") as HTMLElement;
const lessonCourseName = document.getElementById(
  "lessonCourseName",
) as HTMLElement;
const lessonCourseId = document.getElementById("lessonCourseId") as HTMLElement;
const lessonProfessor = document.getElementById(
  "lessonProfessor",
) as HTMLElement;
const lessonNumber = document.getElementById("lessonNumber") as HTMLElement;
const lessonName = document.getElementById("lessonName") as HTMLElement;
const speedWarningBanner = document.getElementById(
  "speedWarningBanner",
) as HTMLElement;

if (
  !playbackRateSelect ||
  !status ||
  !supportedSection ||
  !notSupportedSection ||
  !saveMarkerButton ||
  !markerLabelInput ||
  !markersList ||
  !markersEmpty ||
  !lessonCourseName ||
  !lessonCourseId ||
  !lessonProfessor ||
  !lessonNumber ||
  !lessonName ||
  !speedWarningBanner
) {
  throw new Error("Required UI elements not found in popup.html");
}

const DEFAULT_PLAYBACK_RATE = "1";
let currentLessonUrl = "";

function setStatus(message: string): void {
  status.textContent = message;
  if (message.trim() === "") {
    status.classList.add("hidden");
    return;
  }

  status.classList.remove("hidden");
}

function normalizeDetailValue(value: string | null | undefined): string {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue === "" ? "-" : trimmedValue;
}

function renderLessonDetails(details: LessonDetails | null | undefined): void {
  lessonCourseName.textContent = normalizeDetailValue(details?.courseName);
  lessonCourseId.textContent = normalizeDetailValue(details?.courseId);
  lessonProfessor.textContent = normalizeDetailValue(details?.professorName);
  lessonNumber.textContent = normalizeDetailValue(details?.lessonNumber);
  lessonName.textContent = normalizeDetailValue(details?.lessonName);
}

function showSupported(): void {
  supportedSection.classList.remove("hidden");
  notSupportedSection.classList.add("hidden");
}

function showNotSupported(): void {
  supportedSection.classList.add("hidden");
  notSupportedSection.classList.remove("hidden");
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

function createMarkerId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createMarkerLabelElement(label: string): HTMLSpanElement {
  const markerLabelElement = document.createElement("span");
  markerLabelElement.className = "marker-label";
  markerLabelElement.textContent = label;
  return markerLabelElement;
}

async function getStoredPlaybackRate(): Promise<string> {
  const result = await chrome.storage.local.get("vlp_lastPlaybackRate");
  const storedPlaybackRate = result.vlp_lastPlaybackRate;

  if (typeof storedPlaybackRate !== "string") {
    return DEFAULT_PLAYBACK_RATE;
  }

  return storedPlaybackRate;
}

async function setStoredPlaybackRate(playbackRate: string): Promise<void> {
  await chrome.storage.local.set({ vlp_lastPlaybackRate: playbackRate });
}

async function getMarkerStore(): Promise<MarkerStore> {
  const result = (await chrome.storage.local.get(
    MARKERS_STORAGE_KEY,
  )) as Record<string, unknown>;
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

async function setMarkerStore(store: MarkerStore): Promise<void> {
  await chrome.storage.local.set({ [MARKERS_STORAGE_KEY]: store });
}

function getMarkersForUrl(store: MarkerStore, url: string): Marker[] {
  const normalizedUrl = normalizeLessonUrl(url);
  const markers = store[normalizedUrl];

  if (!Array.isArray(markers)) {
    return [];
  }

  return markers.filter(isMarker);
}

async function loadLessonContext(): Promise<LessonContextResponse | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[V-Lesson Plus] No active tab found while loading lesson context.",
    );
    return null;
  }

  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "GET_LESSON_CONTEXT",
    })) as LessonContextResponse;

    return response;
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to load lesson context:", error);
    return null;
  }
}

async function renderMarkersForCurrentLesson(): Promise<void> {
  if (!currentLessonUrl) {
    markersList.replaceChildren();
    markersEmpty.classList.remove("hidden");
    return;
  }

  const store = await getMarkerStore();
  const markers = getMarkersForUrl(store, currentLessonUrl).sort(
    (left, right) => {
      if (left.time !== right.time) {
        return left.time - right.time;
      }

      return left.createdAt - right.createdAt;
    },
  );

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
      jumpToMarker(marker).catch((error: Error) => {
        console.log("[V-Lesson Plus] Failed to jump to marker:", error);
        setStatus(`Error: ${error.message}`);
      });
    });

    const meta = document.createElement("div");
    meta.className = "marker-meta";
    if (marker.label) {
      meta.append(createMarkerLabelElement(marker.label));
    }

    const savedAt = document.createElement("span");
    savedAt.textContent = `Saved at ${formatMarkerTime(marker.time)}`;
    meta.append(savedAt);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "marker-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteMarker(marker.id).catch((error: Error) => {
        console.log("[V-Lesson Plus] Failed to delete marker:", error);
        setStatus(`Error: ${error.message}`);
      });
    });

    const actions = document.createElement("div");
    actions.className = "marker-actions";
    actions.append(jumpButton, deleteButton);

    item.append(meta, actions);
    markersList.append(item);
  }
}

async function saveMarkerAtCurrentTime(): Promise<void> {
  const context = await loadLessonContext();

  if (!context?.supported) {
    setStatus("No supported video found on this page.");
    return;
  }

  currentLessonUrl = normalizeLessonUrl(context.url);

  const validatedLabel = validateMarkerLabel(markerLabelInput.value);

  if (validatedLabel === null) {
    setStatus(
      "Marker label can only use letters, spaces, dots, commas, and hyphens.",
    );
    return;
  }

  const store = await getMarkerStore();
  const markers = getMarkersForUrl(store, currentLessonUrl);
  const marker: Marker = {
    id: createMarkerId(),
    time: context.currentTime,
    createdAt: Date.now(),
    ...(validatedLabel ? { label: validatedLabel } : {}),
  };

  store[currentLessonUrl] = [...markers, marker];
  await setMarkerStore(store);
  await renderMarkersForCurrentLesson();
  setStatus(`Saved marker at ${formatMarkerTime(marker.time)}.`);
  markerLabelInput.value = "";
}

async function deleteMarker(markerId: string): Promise<void> {
  if (!currentLessonUrl) {
    return;
  }

  const store = await getMarkerStore();
  const markers = getMarkersForUrl(store, currentLessonUrl);
  const nextMarkers = markers.filter((marker) => marker.id !== markerId);

  if (nextMarkers.length === markers.length) {
    return;
  }

  if (nextMarkers.length === 0) {
    delete store[currentLessonUrl];
  } else {
    store[currentLessonUrl] = nextMarkers;
  }

  await setMarkerStore(store);
  await renderMarkersForCurrentLesson();
  setStatus("Marker deleted.");
}

async function jumpToMarker(marker: Marker): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    setStatus("No active tab found.");
    return;
  }

  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: "SEEK_TO_TIME",
    time: marker.time,
  })) as SeekToTimeResponse;

  if (response?.ok) {
    setStatus(`Jumped to ${formatMarkerTime(marker.time)}.`);
    return;
  }

  setStatus(response?.message ?? "Unable to jump to marker.");
}

async function applyPlaybackRate(playbackRate: string): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[V-Lesson Plus] No active tab found while trying to set playback rate.",
    );
    setStatus("No active tab found.");
    return;
  }

  const normalizedPlaybackRate = normalizePlaybackRate(playbackRate);

  if (normalizedPlaybackRate === null) {
    console.log(
      `[V-Lesson Plus] Invalid playback rate selected: ${playbackRate}.`,
    );
    setStatus("Invalid playback rate selected.");
    return;
  }

  console.log(
    `[V-Lesson Plus] Sending playback rate ${normalizedPlaybackRate} to tab ${tab.id}.`,
  );

  await setStoredPlaybackRate(playbackRate);

  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "SET_PLAYBACK_RATE",
      playbackRate: normalizedPlaybackRate,
    })) as SetPlaybackRateResponse;

    console.log("[V-Lesson Plus] Content script response:", response);
    setStatus(response?.message ?? "Unable to apply playback rate.");
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to send playback rate message:", error);
    setStatus(
      "This page is not ready for the extension yet. Reload the page and try again.",
    );
  }
}

playbackRateSelect.addEventListener("change", () => {
  console.log(`[V-Lesson Plus] Select changed to ${playbackRateSelect.value}.`);

  // Show/hide warning banner for 2x speed
  if (playbackRateSelect.value === "2") {
    speedWarningBanner.classList.remove("hidden");
  } else {
    speedWarningBanner.classList.add("hidden");
  }

  applyPlaybackRate(playbackRateSelect.value).catch((error: Error) => {
    console.log(
      "[V-Lesson Plus] Unexpected error while applying playback rate:",
      error,
    );
    setStatus(`Error: ${error.message}`);
  });
});

saveMarkerButton.addEventListener("click", () => {
  saveMarkerAtCurrentTime().catch((error: Error) => {
    console.log("[V-Lesson Plus] Unexpected error while saving marker:", error);
    setStatus(`Error: ${error.message}`);
  });
});

console.log("[V-Lesson Plus] Popup loaded.");

getStoredPlaybackRate()
  .then((storedPlaybackRate) => {
    playbackRateSelect.value = storedPlaybackRate;

    // Show warning banner if 2x is stored
    if (storedPlaybackRate === "2") {
      speedWarningBanner.classList.remove("hidden");
    } else {
      speedWarningBanner.classList.add("hidden");
    }
  })
  .catch((error: Error) => {
    console.log("[V-Lesson Plus] Failed to load stored playback rate:", error);
  })
  .finally(() => {
    loadLessonContext()
      .then((context) => {
        if (!context?.supported) {
          showNotSupported();
          return;
        }

        showSupported();
        currentLessonUrl = normalizeLessonUrl(context.url);
        renderLessonDetails(context.lessonDetails);
        return renderMarkersForCurrentLesson();
      })
      .catch((error: Error) => {
        console.log("[V-Lesson Plus] Failed to initialize popup:", error);
        showNotSupported();
      });
  });
