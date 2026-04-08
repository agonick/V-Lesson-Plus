import { normalizePlaybackRate } from "./logic";

interface PlaybackRateSelectElement extends HTMLSelectElement {}
interface StatusElement extends HTMLElement {}

const playbackRateSelect = document.getElementById(
  "playbackRateSelect",
) as PlaybackRateSelectElement;
const status = document.getElementById("status") as StatusElement;
const supportedSection = document.getElementById(
  "supportedSection",
) as HTMLDivElement;
const notSupportedSection = document.getElementById(
  "notSupportedSection",
) as HTMLDivElement;

if (
  !playbackRateSelect ||
  !status ||
  !supportedSection ||
  !notSupportedSection
) {
  throw new Error("Required UI elements not found in popup.html");
}

interface CheckVideoElementResponse {
  supported: boolean;
}

interface SetPlaybackRateResponse {
  ok: boolean;
  message: string;
}

async function checkVideoSupport(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[Uninettuno Plus] No active tab found while checking video support.",
    );
    showNotSupported();
    return;
  }

  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "CHECK_VIDEO_ELEMENT",
    })) as CheckVideoElementResponse;

    if (response?.supported) {
      showSupported();
      applyPlaybackRate(playbackRateSelect.value).catch((error: Error) => {
        console.log(
          "[Uninettuno Plus] Unexpected error while applying initial playback rate:",
          error,
        );
        status.textContent = `Error: ${error.message}`;
      });
    } else {
      showNotSupported();
    }
  } catch (error) {
    console.log(
      "[Uninettuno Plus] Failed to check video element support:",
      error,
    );
    showNotSupported();
  }
}

function showSupported(): void {
  supportedSection.classList.remove("hidden");
  notSupportedSection.classList.add("hidden");
}

function showNotSupported(): void {
  supportedSection.classList.add("hidden");
  notSupportedSection.classList.remove("hidden");
}

async function applyPlaybackRate(playbackRate: string): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[Uninettuno Plus] No active tab found while trying to set playback rate.",
    );
    status.textContent = "No active tab found.";
    return;
  }

  const normalizedPlaybackRate = normalizePlaybackRate(playbackRate);

  if (normalizedPlaybackRate === null) {
    console.log(
      `[Uninettuno Plus] Invalid playback rate selected: ${playbackRate}.`,
    );
    status.textContent = "Invalid playback rate selected.";
    return;
  }

  console.log(
    `[Uninettuno Plus] Sending playback rate ${normalizedPlaybackRate} to tab ${tab.id}.`,
  );

  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "SET_PLAYBACK_RATE",
      playbackRate: normalizedPlaybackRate,
    })) as SetPlaybackRateResponse;

    console.log("[Uninettuno Plus] Content script response:", response);
    status.textContent = response?.message ?? "Unable to apply playback rate.";
  } catch (error) {
    console.log(
      "[Uninettuno Plus] Failed to send playback rate message:",
      error,
    );
    status.textContent =
      "This page is not ready for the extension yet. Reload the page and try again.";
  }
}

playbackRateSelect.addEventListener("change", () => {
  console.log(
    `[Uninettuno Plus] Select changed to ${playbackRateSelect.value}.`,
  );
  applyPlaybackRate(playbackRateSelect.value).catch((error: Error) => {
    console.log(
      "[Uninettuno Plus] Unexpected error while applying playback rate:",
      error,
    );
    status.textContent = `Error: ${error.message}`;
  });
});

console.log("[Uninettuno Plus] Popup loaded.");
checkVideoSupport();
