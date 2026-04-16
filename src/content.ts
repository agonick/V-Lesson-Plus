import {
  ensureVideoElement,
  getFirstVjsTechElement,
  applyPlaybackRateToDocument,
  formatMarkerTime,
  getStoredMarkersForUrl,
  renderTimelineMarkers,
  normalizeLessonUrl,
  normalizePlaybackRate,
} from "./logic";

interface CheckVideoElementMessage {
  type: "CHECK_VIDEO_ELEMENT";
}

interface SetPlaybackRateMessage {
  type: "SET_PLAYBACK_RATE";
  playbackRate: number;
}

interface GetLessonContextMessage {
  type: "GET_LESSON_CONTEXT";
}

interface SeekToTimeMessage {
  type: "SEEK_TO_TIME";
  time: number;
}

type ContentMessage =
  | CheckVideoElementMessage
  | SetPlaybackRateMessage
  | GetLessonContextMessage
  | SeekToTimeMessage;

interface LessonContextResponse {
  supported: boolean;
  currentTime: number;
  url: string;
  lessonDetails: LessonDetails;
}

interface LessonDetails {
  courseId: string | null;
  courseName: string | null;
  professorName: string | null;
  lessonNumber: string | null;
  lessonName: string | null;
}

interface SeekToTimeResponse {
  ok: boolean;
  message: string;
}

const TOAST_ID = "v-lesson-plus-toast";
const TOAST_HIDE_DELAY_MS = 1500;
const AUTOPLAY_NEXT_STORAGE_KEY = "vlp_autoplayNextLesson";
const NEXT_LESSON_BUTTON_ID = "ctl01_mainContent_ctl00_hlLezioneSuccessiva";
let autoplayNextLessonEnabled = false;

function getVideoElement(): HTMLMediaElement | null {
  return getFirstVjsTechElement(document);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getTextContent(element: Element | null): string | null {
  if (!element) {
    return null;
  }

  const text = normalizeWhitespace(element.textContent ?? "");
  return text === "" ? null : text;
}

function extractCourseId(currentUrl: string): string | null {
  const hiddenCourseInput = document.querySelector(
    'form#aspnetForm input[name="courseid"][value]',
  ) as HTMLInputElement | null;

  const inputValue = hiddenCourseInput?.value?.trim();
  if (inputValue) {
    return inputValue;
  }

  try {
    const parsedUrl = new URL(currentUrl);
    const urlCourseId = parsedUrl.searchParams.get("courseid")?.trim();
    return urlCourseId || null;
  } catch {
    return null;
  }
}

function extractCourseName(): string | null {
  const specificCourseName = getTextContent(
    document.querySelector(
      "#ctl01_mainContent_ctl00_CyberSpazioNomeMateriaModule1_ltNomeMateria",
    ),
  );

  if (specificCourseName) {
    return specificCourseName;
  }

  const titleBasedCourseName = getTextContent(
    document.querySelector(".nome-materia span[title]"),
  );

  if (!titleBasedCourseName) {
    return null;
  }

  return normalizeWhitespace(
    titleBasedCourseName.replace(/\(id:\s*\d+\)/i, ""),
  );
}

function extractProfessorName(): string | null {
  const paragraphs = Array.from(document.querySelectorAll("p"));

  for (const paragraph of paragraphs) {
    const paragraphText = normalizeWhitespace(paragraph.textContent ?? "");
    if (!/Docente\s*Video\s*:/i.test(paragraphText)) {
      continue;
    }

    const strongProfessor = getTextContent(paragraph.querySelector("strong"));
    if (strongProfessor) {
      return strongProfessor;
    }

    const fallbackProfessor = paragraphText
      .replace(/.*Docente\s*Video\s*:/i, "")
      .trim();
    return fallbackProfessor || null;
  }

  return null;
}

function extractLessonInfo(): {
  lessonNumber: string | null;
  lessonName: string | null;
} {
  const paragraphs = Array.from(document.querySelectorAll("p"));

  for (const paragraph of paragraphs) {
    const paragraphText = normalizeWhitespace(paragraph.textContent ?? "");
    const match = paragraphText.match(
      /Lezione\s*n\.?\s*(\d+)\s*:\s*([^]+?)(?:\s+Successiva|$)/i,
    );

    if (!match) {
      continue;
    }

    const lessonNumber = match[1]?.trim() || null;
    const lessonName = normalizeWhitespace((match[2] ?? "").trim());

    return {
      lessonNumber,
      lessonName: lessonName || null,
    };
  }

  return {
    lessonNumber: null,
    lessonName: null,
  };
}

function extractLessonDetails(currentUrl: string): LessonDetails {
  const lessonInfo = extractLessonInfo();

  return {
    courseId: extractCourseId(currentUrl),
    courseName: extractCourseName(),
    professorName: extractProfessorName(),
    lessonNumber: lessonInfo.lessonNumber,
    lessonName: lessonInfo.lessonName,
  };
}

function showToast(message: string, isError = false): void {
  const existing = document.getElementById(TOAST_ID);
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.top = "16px";
  toast.style.right = "16px";
  toast.style.zIndex = "2147483647";
  toast.style.padding = "8px 12px";
  toast.style.borderRadius = "8px";
  toast.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  toast.style.fontSize = "12px";
  toast.style.fontWeight = "600";
  toast.style.color = "#ffffff";
  toast.style.background = isError ? "#dc2626" : "#16a34a";
  toast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 120ms ease-in-out";

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  window.setTimeout(() => {
    toast.style.opacity = "0";
    window.setTimeout(() => {
      toast.remove();
    }, 140);
  }, TOAST_HIDE_DELAY_MS);
}

function clickNextLessonIfPresent(): void {
  const nextLessonButton = document.getElementById(
    NEXT_LESSON_BUTTON_ID,
  ) as HTMLElement | null;

  if (!nextLessonButton) {
    console.log(
      `[V-Lesson Plus] Autoplay enabled but next lesson button #${NEXT_LESSON_BUTTON_ID} was not found.`,
    );
    return;
  }

  nextLessonButton.click();
  console.log("[V-Lesson Plus] Autoplay triggered next lesson click.");
}

async function loadAutoplayNextSetting(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(AUTOPLAY_NEXT_STORAGE_KEY);
    autoplayNextLessonEnabled = result[AUTOPLAY_NEXT_STORAGE_KEY] === true;
  } catch (error) {
    autoplayNextLessonEnabled = false;
    console.log("[V-Lesson Plus] Failed to load autoplay setting:", error);
  }
}

const video = ensureVideoElement(document);

if (video) {
  console.log("[V-Lesson Plus] Found .vjs-tech element on this page:", video);

  loadAutoplayNextSetting().catch((error) => {
    console.log(
      "[V-Lesson Plus] Failed to initialize autoplay setting:",
      error,
    );
  });

  // Auto-apply saved playback rate on page load
  async function applyStoredPlaybackRate(): Promise<void> {
    try {
      const result = await chrome.storage.local.get("vlp_lastPlaybackRate");
      const storedRate = result.vlp_lastPlaybackRate;

      if (typeof storedRate === "string") {
        const normalizedRate = normalizePlaybackRate(storedRate);
        if (normalizedRate !== null) {
          const currentVideo = ensureVideoElement(document);
          if (currentVideo) {
            (currentVideo as any).playbackRate = normalizedRate;
            console.log(
              `[V-Lesson Plus] Applied stored playback rate ${normalizedRate}x on page load.`,
            );
          }
        }
      }
    } catch (error) {
      console.log(
        "[V-Lesson Plus] Failed to apply stored playback rate:",
        error,
      );
    }
  }

  // Apply saved rate immediately
  applyStoredPlaybackRate();

  // Also re-apply when video metadata loads
  video.addEventListener("loadedmetadata", () => {
    applyStoredPlaybackRate().catch((error) => {
      console.log("[V-Lesson Plus] Failed to re-apply playback rate:", error);
    });
  });

  // Initialize timeline markers
  async function setupTimelineMarkers(): Promise<void> {
    const normalizedUrl = normalizeLessonUrl(window.location.href);
    const markers = await getStoredMarkersForUrl(normalizedUrl);
    const currentVideo = ensureVideoElement(document);
    if (currentVideo) {
      renderTimelineMarkers(document, currentVideo, markers);
    }
  }

  setupTimelineMarkers().catch((error) => {
    console.log("[V-Lesson Plus] Failed to setup timeline markers:", error);
  });

  // Re-render markers when video metadata loads (duration becomes available)
  video.addEventListener("loadedmetadata", () => {
    setupTimelineMarkers().catch((error) => {
      console.log("[V-Lesson Plus] Failed to update timeline markers:", error);
    });
  });

  // Listen for storage changes (markers added/deleted from popup)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && AUTOPLAY_NEXT_STORAGE_KEY in changes) {
      autoplayNextLessonEnabled =
        changes[AUTOPLAY_NEXT_STORAGE_KEY]?.newValue === true;
    }

    if (areaName === "local" && changes.vlp_markers) {
      setupTimelineMarkers().catch((error) => {
        console.log(
          "[V-Lesson Plus] Failed to update timeline markers after storage change:",
          error,
        );
      });
    }
  });

  video.addEventListener("ended", () => {
    if (!autoplayNextLessonEnabled) {
      return;
    }

    clickNextLessonIfPresent();
  });
} else {
  console.log("[V-Lesson Plus] No .vjs-tech element found on this page.");
}

chrome.runtime.onMessage.addListener(
  (
    message: ContentMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (message?.type === "CHECK_VIDEO_ELEMENT") {
      const currentVideo = ensureVideoElement(document);
      sendResponse({ supported: currentVideo !== null });
      return;
    }

    if (message?.type === "GET_LESSON_CONTEXT") {
      const currentVideo = ensureVideoElement(document);
      const currentUrl = window.location.href;

      sendResponse({
        supported: currentVideo !== null,
        currentTime: currentVideo?.currentTime ?? 0,
        url: currentUrl,
        lessonDetails: extractLessonDetails(currentUrl),
      } satisfies LessonContextResponse);
      return;
    }

    if (message?.type !== "SET_PLAYBACK_RATE") {
      if (message?.type !== "SEEK_TO_TIME") {
        return;
      }

      const currentVideo = ensureVideoElement(document);

      if (!currentVideo) {
        console.log(
          "[V-Lesson Plus] SEEK_TO_TIME received, but no .vjs-tech element was found.",
        );
        showToast("No video found on this page", true);
        sendResponse({
          ok: false,
          message: "No .vjs-tech element found on this page.",
        } satisfies SeekToTimeResponse);
        return;
      }

      currentVideo.currentTime = message.time;
      showToast(`Jumped to ${formatMarkerTime(message.time)}`);
      sendResponse({
        ok: true,
        message: `Jumped to ${message.time}.`,
      } satisfies SeekToTimeResponse);
      return;
    }

    const currentVideo = ensureVideoElement(document);
    if (!currentVideo) {
      console.log(
        "[V-Lesson Plus] SET_PLAYBACK_RATE received, but no .vjs-tech element was found.",
      );
      showToast("No video found on this page", true);
      sendResponse({
        ok: false,
        message: "No .vjs-tech element found on this page.",
      });
      return;
    }

    const result = applyPlaybackRateToDocument(document, message.playbackRate);
    console.log(
      `[V-Lesson Plus] Playback rate set to ${message.playbackRate}.`,
      currentVideo,
    );
    if (result.ok) {
      showToast(`Speed ${message.playbackRate}x`);
    } else {
      showToast(result.message, true);
    }
    sendResponse(result);
  },
);
