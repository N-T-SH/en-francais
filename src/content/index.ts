import { LEVELS, Lesson, Revision, type Level, type Section } from "./schema";

// Content is bundled at build time: dropping a JSON file into content/lessons
// or content/revisions and redeploying is all it takes to publish it.
const lessonFiles = import.meta.glob("../../content/lessons/*.json", { eager: true, import: "default" });
const revisionFiles = import.meta.glob("../../content/revisions/*.json", { eager: true, import: "default" });

export const lessons: Lesson[] = Object.values(lessonFiles)
  .map((raw) => Lesson.parse(raw))
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order);

export const revisions: Revision[] = Object.values(revisionFiles)
  .map((raw) => Revision.parse(raw))
  .sort((a, b) => b.created.localeCompare(a.created));

export interface SectionRef {
  lesson: Lesson;
  section: Section;
  /** Textbook lesson number and section position, e.g. "3.2" (restarts in each level). */
  number: string;
  /** Same, qualified with the level so it is unambiguous across books, e.g. "A2·3.2". */
  label: string;
  key: string;
}

export const sectionIndex: Map<string, SectionRef> = new Map();
lessons.forEach((lesson) =>
  lesson.sections.forEach((section, si) => {
    const key = `${lesson.id}/${section.id}`;
    const number = `${lessonNumber(lesson)}.${si + 1}`;
    sectionIndex.set(key, { lesson, section, number, label: `${lesson.level}·${number}`, key });
  }),
);

/** Number shown for a lesson: the textbook's, else its position in the library. */
export function lessonNumber(lesson: Lesson): number {
  return lesson.number ?? lessons.indexOf(lesson) + 1;
}

export interface UnitGroup {
  level: Level;
  unit: number | null;
  title?: string;
  lessons: Lesson[];
}

/** The textbook behind each level. */
export const LEVEL_INFO: Record<Level, { book: string; name: string }> = {
  A1: { book: "Inspire 1", name: "Niveau A1 · débutant" },
  A2: { book: "Inspire 2", name: "Niveau A2 · élémentaire" },
  B1: { book: "Inspire 3", name: "Niveau B1 · intermédiaire" },
  B2: { book: "Inspire 4", name: "Niveau B2 · intermédiaire avancé" },
};

/** Levels that have at least one lesson, lowest first. */
export const levels: Level[] = LEVELS.filter((l) => lessons.some((x) => x.level === l));

/** Lessons of one level grouped by consecutive unit, in library order. */
export function unitGroups(level: Level): UnitGroup[] {
  const groups: UnitGroup[] = [];
  for (const lesson of lessons.filter((l) => l.level === level)) {
    const unit = lesson.unit ?? null;
    const last = groups[groups.length - 1];
    if (last && last.unit === unit) last.lessons.push(lesson);
    else groups.push({ level, unit, title: lesson.unitTitle, lessons: [lesson] });
  }
  return groups;
}

export function lessonMinutes(sections: Section[]): number {
  return sections.reduce((n, s) => n + (s.minutes ?? 0), 0);
}
