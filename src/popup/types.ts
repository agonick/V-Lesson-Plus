import type { Marker } from "../logic";

export interface LessonDetails {
  courseId: string | null;
  courseName: string | null;
  professorName: string | null;
  lessonNumber: string | null;
  lessonName: string | null;
}

export interface LessonContextResponse {
  supported: boolean;
  currentTime: number;
  url: string;
  lessonDetails: LessonDetails;
}

export interface SetPlaybackRateResponse {
  ok: boolean;
  message: string;
}

export interface SeekToTimeResponse {
  ok: boolean;
  message: string;
}

export interface PopupElements {
  playbackRateSelect: HTMLSelectElement;
  status: HTMLElement;
  supportedSection: HTMLDivElement;
  notSupportedSection: HTMLDivElement;
  lessonDetailsPanel: HTMLElement;
  saveMarkerButton: HTMLButtonElement;
  markerLabelInput: HTMLInputElement;
  markersList: HTMLUListElement;
  markersEmpty: HTMLElement;
  lessonCourseName: HTMLElement;
  lessonCourseId: HTMLElement;
  lessonProfessor: HTMLElement;
  lessonNumber: HTMLElement;
  lessonName: HTMLElement;
  autoplayNextToggle: HTMLInputElement;
  speedWarningBanner: HTMLElement;
  languageToggleButton: HTMLButtonElement;
}

export type TranslateFn = (
  key: string,
  replacements?: Record<string, string | number>,
) => string;

export type JumpHandler = (marker: Marker) => void;
export type DeleteHandler = (markerId: string) => void;
