import {
  getFirstVjsTechElement,
  applyPlaybackRateToDocument,
} from "./logic";

interface CheckVideoElementMessage {
  type: "CHECK_VIDEO_ELEMENT";
}

interface SetPlaybackRateMessage {
  type: "SET_PLAYBACK_RATE";
  playbackRate: number;
}

type ContentMessage = CheckVideoElementMessage | SetPlaybackRateMessage;

const TOAST_ID = "v-lesson-plus-toast";
const TOAST_HIDE_DELAY_MS = 1500;

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
  toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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

const video = getFirstVjsTechElement(document);

if (video) {
  console.log("[V-Lesson Plus] Found .vjs-tech element on this page:", video);
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
      sendResponse({ supported: video !== null });
      return;
    }

    if (message?.type !== "SET_PLAYBACK_RATE") {
      return;
    }

    if (!video) {
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
      video,
    );
    if (result.ok) {
      showToast(`Speed ${message.playbackRate}x`);
    } else {
      showToast(result.message, true);
    }
    sendResponse(result);
  },
);
