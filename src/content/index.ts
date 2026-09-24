import { Lesson, Revision, type Section } from "./schema";

// Content is bundled at build time: dropping a JSON file into content/lessons
// or content/revisions and redeploying is all it takes to publish it.
const lessonFiles = import.meta.glob("../../content/lessons/*.json", { eager: true, import: "default" });
const revisionFiles = import.meta.glob("../../content/revisions/*.json", { eager: true, import: "default" });

export const lessons: Lesson[] = Object.values(lessonFiles)
  .map((raw) => Lesson.parse(raw))
  .sort((a, b) => a.order - b.order);

export const revisions: Revision[] = Object.values(revisionFiles)
  .map((raw) => Revision.parse(raw))
  .sort((a, b) => b.created.localeCompare(a.created));

export interface SectionRef {
  lesson: Lesson;
  section: Section;
  /** 1-based lesson position and section position, e.g. "3.2". */
  number: string;
  key: string;
}

export const sectionIndex: Map<string, SectionRef> = new Map();
lessons.forEach((lesson, li) =>
  lesson.sections.forEach((section, si) => {
    const key = `${lesson.id}/${section.id}`;
    sectionIndex.set(key, { lesson, section, number: `${li + 1}.${si + 1}`, key });
  }),
);

export function lessonNumber(lesson: Lesson): number {
  return lessons.indexOf(lesson) + 1;
}

export function lessonMinutes(sections: Section[]): number {
  return sections.reduce((n, s) => n + (s.minutes ?? 0), 0);
}
