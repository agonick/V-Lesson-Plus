import type { LessonDetails } from "./types";

export function normalizeDetailValue(value: string | null | undefined): string {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue === "" ? "-" : trimmedValue;
}

export function renderLessonDetails(
  details: LessonDetails | null | undefined,
  elements: {
    lessonCourseName: HTMLElement;
    lessonCourseId: HTMLElement;
    lessonProfessor: HTMLElement;
    lessonNumber: HTMLElement;
    lessonName: HTMLElement;
  },
): void {
  elements.lessonCourseName.textContent = normalizeDetailValue(
    details?.courseName,
  );
  elements.lessonCourseId.textContent = normalizeDetailValue(details?.courseId);
  elements.lessonProfessor.textContent = normalizeDetailValue(
    details?.professorName,
  );
  elements.lessonNumber.textContent = normalizeDetailValue(
    details?.lessonNumber,
  );
  elements.lessonName.textContent = normalizeDetailValue(details?.lessonName);
}
