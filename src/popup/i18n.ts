export type Language = "it" | "en";

export const LANGUAGE_STORAGE_KEY = "vlp_language";

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  it: {
    appTitle: "V-Lesson Plus",
    lessonDetailsTitle: "Dettagli lezione",
    detailCourse: "Corso",
    detailCourseId: "ID Corso",
    detailProfessor: "Docente",
    detailLessonNumber: "Numero lezione",
    detailLessonName: "Nome lezione",
    detailAutoplayNext: "Autoplay successiva",
    playbackTitle: "Riproduzione",
    playbackDescription:
      "Scegli una velocita e l'estensione la applichera al video Uninettuno attivo.",
    speedLabel: "Velocita",
    speedWarningTitle: "Avviso:",
    speedWarningBody:
      "la velocita 2x potrebbe causare un tracciamento incompleto. Consigliato 1.25x o 1.5x. Controlla sempre lo stato del tracciamento.",
    markersTitle: "Marker",
    saveMarkerButton: "Salva marker",
    markersDescription:
      "Salva il tempo corrente della lezione e torna facilmente a quel punto.",
    markerLabel: "Etichetta marker",
    markerPlaceholder: "Etichetta opzionale",
    markersEmpty: "Nessun marker salvato per questa lezione.",
    notSupportedMessage: "Questa estensione non e supportata in questa pagina.",
    languageButton: "EN",
    languageToggleAria: "Passa all'inglese",
    errorPrefix: "Errore",
    statusNoSupportedVideo: "Nessun video supportato trovato in questa pagina.",
    statusInvalidMarkerLabel:
      "L'etichetta puo contenere solo lettere, spazi, punti, virgole e trattini.",
    statusSavedMarkerAt: "Marker salvato a {time}.",
    statusMarkerDeleted: "Marker eliminato.",
    statusNoActiveTab: "Nessuna scheda attiva trovata.",
    statusJumpedTo: "Spostato a {time}.",
    statusUnableToJump: "Impossibile spostarsi al marker.",
    statusInvalidPlaybackRate: "Velocita selezionata non valida.",
    statusUnableApplyPlaybackRate: "Impossibile applicare la velocita.",
    statusAutoplayEnabled:
      "Autoplay attivo: la prossima lezione partira alla fine del video.",
    statusAutoplayDisabled: "Autoplay disattivato.",
    statusPageNotReady:
      "Questa pagina non e pronta per l'estensione. Ricarica la pagina e riprova.",
    markerSavedAt: "Salvato a {time}",
    markerDelete: "Elimina",
  },
  en: {
    appTitle: "V-Lesson Plus",
    lessonDetailsTitle: "Lesson Details",
    detailCourse: "Course",
    detailCourseId: "Course ID",
    detailProfessor: "Professor",
    detailLessonNumber: "Lesson Number",
    detailLessonName: "Lesson Name",
    detailAutoplayNext: "Autoplay Next",
    playbackTitle: "Playback",
    playbackDescription:
      "Choose a speed and the extension will apply it to the active Uninettuno video.",
    speedLabel: "Speed",
    speedWarningTitle: "Warning:",
    speedWarningBody:
      "2x speed may result in incomplete tracking. Use 1.25x or 1.5x for safety. Always verify your tracking status.",
    markersTitle: "Markers",
    saveMarkerButton: "Save marker",
    markersDescription:
      "Save the current lesson time and jump back to it later.",
    markerLabel: "Marker label",
    markerPlaceholder: "Optional label",
    markersEmpty: "No markers saved for this lesson yet.",
    notSupportedMessage: "This extension is not supported for this page.",
    languageButton: "IT",
    languageToggleAria: "Switch to Italian",
    errorPrefix: "Error",
    statusNoSupportedVideo: "No supported video found on this page.",
    statusInvalidMarkerLabel:
      "Marker label can only use letters, spaces, dots, commas, and hyphens.",
    statusSavedMarkerAt: "Saved marker at {time}.",
    statusMarkerDeleted: "Marker deleted.",
    statusNoActiveTab: "No active tab found.",
    statusJumpedTo: "Jumped to {time}.",
    statusUnableToJump: "Unable to jump to marker.",
    statusInvalidPlaybackRate: "Invalid playback rate selected.",
    statusUnableApplyPlaybackRate: "Unable to apply playback rate.",
    statusAutoplayEnabled:
      "Autoplay enabled: next lesson will start when the video ends.",
    statusAutoplayDisabled: "Autoplay disabled.",
    statusPageNotReady:
      "This page is not ready for the extension yet. Reload the page and try again.",
    markerSavedAt: "Saved at {time}",
    markerDelete: "Delete",
  },
};

export function detectDefaultLanguage(navigatorLanguage: string): Language {
  return navigatorLanguage.toLowerCase().startsWith("it") ? "it" : "en";
}

export async function getStoredLanguage(
  storage: chrome.storage.StorageArea,
  navigatorLanguage: string,
): Promise<Language> {
  const result = await storage.get(LANGUAGE_STORAGE_KEY);
  const storedLanguage = result[LANGUAGE_STORAGE_KEY];

  if (storedLanguage === "it" || storedLanguage === "en") {
    return storedLanguage;
  }

  return detectDefaultLanguage(navigatorLanguage);
}

export async function setStoredLanguage(
  storage: chrome.storage.StorageArea,
  language: Language,
): Promise<void> {
  await storage.set({ [LANGUAGE_STORAGE_KEY]: language });
}

export function translate(
  language: Language,
  key: string,
  replacements?: Record<string, string | number>,
): string {
  let template = TRANSLATIONS[language][key] ?? key;

  if (!replacements) {
    return template;
  }

  for (const [replacementKey, replacementValue] of Object.entries(
    replacements,
  )) {
    template = template.replaceAll(
      `{${replacementKey}}`,
      String(replacementValue),
    );
  }

  return template;
}

export function applyTranslationsToDom(
  documentLike: Document,
  language: Language,
  languageToggleButton: HTMLButtonElement,
): void {
  const textElements =
    documentLike.querySelectorAll<HTMLElement>("[data-i18n]");
  for (const element of textElements) {
    const key = element.dataset.i18n;
    if (!key) {
      continue;
    }

    element.textContent = translate(language, key);
  }

  const placeholderElements = documentLike.querySelectorAll<HTMLInputElement>(
    "[data-i18n-placeholder]",
  );
  for (const element of placeholderElements) {
    const key = element.dataset.i18nPlaceholder;
    if (!key) {
      continue;
    }

    element.placeholder = translate(language, key);
  }

  languageToggleButton.textContent = translate(language, "languageButton");
  languageToggleButton.setAttribute(
    "aria-label",
    translate(language, "languageToggleAria"),
  );
  documentLike.documentElement.lang = language;
}
