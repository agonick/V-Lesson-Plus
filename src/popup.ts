import {
  formatMarkerTime,
  normalizeLessonUrl,
  validateMarkerLabel,
  type Marker,
} from "./logic";
import {
  applyTranslationsToDom,
  getStoredLanguage,
  setStoredLanguage,
  translate,
  type Language,
} from "./popup/i18n";
import { renderLessonDetails } from "./popup/lesson-details";
import {
  createMarkerId,
  getMarkerStore,
  getMarkersForUrl,
  renderMarkersList,
  setMarkerStore,
} from "./popup/markers";
import {
  applyPlaybackRateToActiveTab,
  getStoredPlaybackRate,
} from "./popup/playback";
import type {
  LessonContextResponse,
  PopupElements,
  SeekToTimeResponse,
} from "./popup/types";

function getPopupElements(): PopupElements {
  const playbackRateSelect = document.getElementById(
    "playbackRateSelect",
  ) as HTMLSelectElement | null;
  const status = document.getElementById("status") as HTMLElement | null;
  const supportedSection = document.getElementById(
    "supportedSection",
  ) as HTMLDivElement | null;
  const notSupportedSection = document.getElementById(
    "notSupportedSection",
  ) as HTMLDivElement | null;
  const saveMarkerButton = document.getElementById(
    "saveMarkerButton",
  ) as HTMLButtonElement | null;
  const markerLabelInput = document.getElementById(
    "markerLabelInput",
  ) as HTMLInputElement | null;
  const markersList = document.getElementById(
    "markersList",
  ) as HTMLUListElement | null;
  const markersEmpty = document.getElementById(
    "markersEmpty",
  ) as HTMLElement | null;
  const lessonCourseName = document.getElementById(
    "lessonCourseName",
  ) as HTMLElement | null;
  const lessonCourseId = document.getElementById(
    "lessonCourseId",
  ) as HTMLElement | null;
  const lessonProfessor = document.getElementById(
    "lessonProfessor",
  ) as HTMLElement | null;
  const lessonNumber = document.getElementById(
    "lessonNumber",
  ) as HTMLElement | null;
  const lessonName = document.getElementById(
    "lessonName",
  ) as HTMLElement | null;
  const speedWarningBanner = document.getElementById(
    "speedWarningBanner",
  ) as HTMLElement | null;
  const languageToggleButton = document.getElementById(
    "languageToggleButton",
  ) as HTMLButtonElement | null;

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
    !speedWarningBanner ||
    !languageToggleButton
  ) {
    throw new Error("Required UI elements not found in popup.html");
  }

  return {
    playbackRateSelect,
    status,
    supportedSection,
    notSupportedSection,
    saveMarkerButton,
    markerLabelInput,
    markersList,
    markersEmpty,
    lessonCourseName,
    lessonCourseId,
    lessonProfessor,
    lessonNumber,
    lessonName,
    speedWarningBanner,
    languageToggleButton,
  };
}

const elements = getPopupElements();
let currentLessonUrl = "";
let currentLanguage: Language = "it";

function t(
  key: string,
  replacements?: Record<string, string | number>,
): string {
  return translate(currentLanguage, key, replacements);
}

function setStatus(message: string): void {
  elements.status.textContent = message;
  if (message.trim() === "") {
    elements.status.classList.add("hidden");
    return;
  }

  elements.status.classList.remove("hidden");
}

function showSupported(): void {
  elements.supportedSection.classList.remove("hidden");
  elements.notSupportedSection.classList.add("hidden");
}

function showNotSupported(): void {
  elements.supportedSection.classList.add("hidden");
  elements.notSupportedSection.classList.remove("hidden");
}

function updateSpeedWarningBanner(playbackRate: string): void {
  if (playbackRate === "2") {
    elements.speedWarningBanner.classList.remove("hidden");
  } else {
    elements.speedWarningBanner.classList.add("hidden");
  }
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
    elements.markersList.replaceChildren();
    elements.markersEmpty.classList.remove("hidden");
    return;
  }

  const store = await getMarkerStore(chrome.storage.local);
  const markers = getMarkersForUrl(store, currentLessonUrl).sort(
    (left, right) => {
      if (left.time !== right.time) {
        return left.time - right.time;
      }

      return left.createdAt - right.createdAt;
    },
  );

  renderMarkersList(
    markers,
    elements.markersList,
    elements.markersEmpty,
    (marker) => {
      jumpToMarker(marker).catch((error: Error) => {
        setStatus(`${t("errorPrefix")}: ${error.message}`);
      });
    },
    (markerId) => {
      deleteMarker(markerId).catch((error: Error) => {
        setStatus(`${t("errorPrefix")}: ${error.message}`);
      });
    },
    t,
    (message) => {
      setStatus(message);
    },
  );
}

async function saveMarkerAtCurrentTime(): Promise<void> {
  const context = await loadLessonContext();

  if (!context?.supported) {
    setStatus(t("statusNoSupportedVideo"));
    return;
  }

  currentLessonUrl = normalizeLessonUrl(context.url);

  const validatedLabel = validateMarkerLabel(elements.markerLabelInput.value);

  if (validatedLabel === null) {
    setStatus(t("statusInvalidMarkerLabel"));
    return;
  }

  const store = await getMarkerStore(chrome.storage.local);
  const markers = getMarkersForUrl(store, currentLessonUrl);
  const marker: Marker = {
    id: createMarkerId(),
    time: context.currentTime,
    createdAt: Date.now(),
    ...(validatedLabel ? { label: validatedLabel } : {}),
  };

  store[currentLessonUrl] = [...markers, marker];
  await setMarkerStore(chrome.storage.local, store);
  await renderMarkersForCurrentLesson();
  setStatus(t("statusSavedMarkerAt", { time: formatMarkerTime(marker.time) }));
  elements.markerLabelInput.value = "";
}

async function deleteMarker(markerId: string): Promise<void> {
  if (!currentLessonUrl) {
    return;
  }

  const store = await getMarkerStore(chrome.storage.local);
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

  await setMarkerStore(chrome.storage.local, store);
  await renderMarkersForCurrentLesson();
  setStatus(t("statusMarkerDeleted"));
}

async function jumpToMarker(marker: Marker): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    setStatus(t("statusNoActiveTab"));
    return;
  }

  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: "SEEK_TO_TIME",
    time: marker.time,
  })) as SeekToTimeResponse;

  if (response?.ok) {
    setStatus(t("statusJumpedTo", { time: formatMarkerTime(marker.time) }));
    return;
  }

  setStatus(response?.message ?? t("statusUnableToJump"));
}

elements.playbackRateSelect.addEventListener("change", () => {
  console.log(
    `[V-Lesson Plus] Select changed to ${elements.playbackRateSelect.value}.`,
  );

  updateSpeedWarningBanner(elements.playbackRateSelect.value);

  applyPlaybackRateToActiveTab(
    elements.playbackRateSelect.value,
    setStatus,
    t,
  ).catch((error: Error) => {
    console.log(
      "[V-Lesson Plus] Unexpected error while applying playback rate:",
      error,
    );
    setStatus(`${t("errorPrefix")}: ${error.message}`);
  });
});

elements.saveMarkerButton.addEventListener("click", () => {
  saveMarkerAtCurrentTime().catch((error: Error) => {
    console.log("[V-Lesson Plus] Unexpected error while saving marker:", error);
    setStatus(`${t("errorPrefix")}: ${error.message}`);
  });
});

elements.languageToggleButton.addEventListener("click", () => {
  const nextLanguage: Language = currentLanguage === "it" ? "en" : "it";
  currentLanguage = nextLanguage;

  applyTranslationsToDom(
    document,
    currentLanguage,
    elements.languageToggleButton,
  );

  setStoredLanguage(chrome.storage.local, nextLanguage).catch(
    (error: Error) => {
      console.log("[V-Lesson Plus] Failed to store language selection:", error);
    },
  );

  renderMarkersForCurrentLesson().catch((error: Error) => {
    console.log(
      "[V-Lesson Plus] Failed to rerender markers after language switch:",
      error,
    );
  });
});

async function initializePopup(): Promise<void> {
  currentLanguage = await getStoredLanguage(
    chrome.storage.local,
    navigator.language,
  );
  applyTranslationsToDom(
    document,
    currentLanguage,
    elements.languageToggleButton,
  );

  try {
    const storedPlaybackRate = await getStoredPlaybackRate(
      chrome.storage.local,
    );
    elements.playbackRateSelect.value = storedPlaybackRate;
    updateSpeedWarningBanner(storedPlaybackRate);
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to load stored playback rate:", error);
  }

  try {
    const context = await loadLessonContext();
    if (!context?.supported) {
      showNotSupported();
      return;
    }

    showSupported();
    currentLessonUrl = normalizeLessonUrl(context.url);
    renderLessonDetails(context.lessonDetails, {
      lessonCourseName: elements.lessonCourseName,
      lessonCourseId: elements.lessonCourseId,
      lessonProfessor: elements.lessonProfessor,
      lessonNumber: elements.lessonNumber,
      lessonName: elements.lessonName,
    });
    await renderMarkersForCurrentLesson();
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to initialize popup:", error);
    showNotSupported();
  }
}

console.log("[V-Lesson Plus] Popup loaded.");

initializePopup().catch((error: Error) => {
  console.log("[V-Lesson Plus] Unexpected popup initialization error:", error);
  showNotSupported();
});
