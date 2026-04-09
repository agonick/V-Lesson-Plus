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

const PLAYBACK_RATE_STORAGE_KEY = "vlp_lastPlaybackRate";
const DEFAULT_PLAYBACK_RATE = "1";

async function getStoredPlaybackRate(): Promise<string> {
  const result = await chrome.storage.local.get(PLAYBACK_RATE_STORAGE_KEY);
  const storedPlaybackRate = result[PLAYBACK_RATE_STORAGE_KEY];

  if (typeof storedPlaybackRate !== "string") {
    return DEFAULT_PLAYBACK_RATE;
  }

  return storedPlaybackRate;
}

async function setStoredPlaybackRate(playbackRate: string): Promise<void> {
  await chrome.storage.local.set({ [PLAYBACK_RATE_STORAGE_KEY]: playbackRate });
}

async function checkVideoSupport(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[V-Lesson Plus] No active tab found while checking video support.",
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
    } else {
      showNotSupported();
    }
  } catch (error) {
    console.log(
      "[V-Lesson Plus] Failed to check video element support:",
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
      "[V-Lesson Plus] No active tab found while trying to set playback rate.",
    );
    status.textContent = "No active tab found.";
    return;
  }

  const normalizedPlaybackRate = normalizePlaybackRate(playbackRate);

  if (normalizedPlaybackRate === null) {
    console.log(
      `[V-Lesson Plus] Invalid playback rate selected: ${playbackRate}.`,
    );
    status.textContent = "Invalid playback rate selected.";
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
    status.textContent = response?.message ?? "Unable to apply playback rate.";
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to send playback rate message:", error);
    status.textContent =
      "This page is not ready for the extension yet. Reload the page and try again.";
  }
}

playbackRateSelect.addEventListener("change", () => {
  console.log(`[V-Lesson Plus] Select changed to ${playbackRateSelect.value}.`);
  applyPlaybackRate(playbackRateSelect.value).catch((error: Error) => {
    console.log(
      "[V-Lesson Plus] Unexpected error while applying playback rate:",
      error,
    );
    status.textContent = `Error: ${error.message}`;
  });
});

console.log("[V-Lesson Plus] Popup loaded.");

getStoredPlaybackRate()
  .then((storedPlaybackRate) => {
    playbackRateSelect.value = storedPlaybackRate;
  })
  .catch((error: Error) => {
    console.log("[V-Lesson Plus] Failed to load stored playback rate:", error);
  })
  .finally(() => {
    checkVideoSupport();
  });
