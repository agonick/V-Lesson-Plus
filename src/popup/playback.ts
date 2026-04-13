import { normalizePlaybackRate } from "../logic";
import type { SetPlaybackRateResponse, TranslateFn } from "./types";

export const DEFAULT_PLAYBACK_RATE = "1";
const PLAYBACK_RATE_STORAGE_KEY = "vlp_lastPlaybackRate";

export async function getStoredPlaybackRate(
  storage: chrome.storage.StorageArea,
): Promise<string> {
  const result = await storage.get(PLAYBACK_RATE_STORAGE_KEY);
  const storedPlaybackRate = result[PLAYBACK_RATE_STORAGE_KEY];

  if (typeof storedPlaybackRate !== "string") {
    return DEFAULT_PLAYBACK_RATE;
  }

  return storedPlaybackRate;
}

export async function setStoredPlaybackRate(
  storage: chrome.storage.StorageArea,
  playbackRate: string,
): Promise<void> {
  await storage.set({ [PLAYBACK_RATE_STORAGE_KEY]: playbackRate });
}

export async function applyPlaybackRateToActiveTab(
  playbackRate: string,
  setStatus: (message: string) => void,
  t: TranslateFn,
): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs;

  if (!tab?.id) {
    console.log(
      "[V-Lesson Plus] No active tab found while trying to set playback rate.",
    );
    setStatus(t("statusNoActiveTab"));
    return;
  }

  const normalizedPlaybackRate = normalizePlaybackRate(playbackRate);

  if (normalizedPlaybackRate === null) {
    console.log(
      `[V-Lesson Plus] Invalid playback rate selected: ${playbackRate}.`,
    );
    setStatus(t("statusInvalidPlaybackRate"));
    return;
  }

  console.log(
    `[V-Lesson Plus] Sending playback rate ${normalizedPlaybackRate} to tab ${tab.id}.`,
  );

  await setStoredPlaybackRate(chrome.storage.local, playbackRate);

  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "SET_PLAYBACK_RATE",
      playbackRate: normalizedPlaybackRate,
    })) as SetPlaybackRateResponse;

    console.log("[V-Lesson Plus] Content script response:", response);
    setStatus(response?.message ?? t("statusUnableApplyPlaybackRate"));
  } catch (error) {
    console.log("[V-Lesson Plus] Failed to send playback rate message:", error);
    setStatus(t("statusPageNotReady"));
  }
}
