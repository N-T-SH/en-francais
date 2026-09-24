import { useEffect, useRef } from "react";
import { lessons, lessonMinutes, lessonNumber } from "../content";
import { actions, useStore } from "../state/store";
import { SectionBody } from "../ui/blocks";
import { href } from "../ui/router";
import { Icon } from "../ui/icons";
import { NotFound } from "./NotFound";

export function LessonView({ id, sectionId }: { id: string; sectionId?: string }) {
  const lesson = lessons.find((l) => l.id === id);
  const done = useStore((s) => s.done);
  const weak = useStore((s) => s.weak);
  const idx = lesson ? Math.max(0, lesson.sections.findIndex((s) => s.id === sectionId)) : 0;

  const tabsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    tabsRef.current?.querySelector(".is-current")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [id, idx]);

  if (!lesson) return <NotFound />;
  const n = lessonNumber(lesson);
  const section = lesson.sections[idx];
  const key = `${lesson.id}/${section.id}`;
  const prev = lesson.sections[idx - 1];
  const next = lesson.sections[idx + 1];
  const nextLesson = lessons[n];
  const isDone = done.includes(key);
  const isWeak = weak.includes(key);

  const continueHref = next ? href.lesson(lesson.id, next.id) : nextLesson ? href.lesson(nextLesson.id) : href.home();

  return (
    <div className="page">
      <a className="back" href={href.home()}><Icon name="back" /> Leçons</a>
      <header className="lesson-head">
        <p className="kicker">Leçon {n} — {lesson.kicker}</p>
        <h1>{lesson.title}</h1>
        <p className="lesson-summary">{lesson.summary} · ~{lessonMinutes(lesson.sections)} min</p>
      </header>

      <nav className="section-tabs" aria-label="Sections" ref={tabsRef}>
        {lesson.sections.map((s, i) => {
          const k = `${lesson.id}/${s.id}`;
          return (
            <a
              key={s.id}
              href={href.lesson(lesson.id, s.id)}
              className={`section-tab${i === idx ? " is-current" : ""}${done.includes(k) ? " is-done" : ""}`}
              aria-current={i === idx ? "page" : undefined}
            >
              <span className="tab-num">{n}.{i + 1}</span>
              <span className="tab-title">{s.title}</span>
              {weak.includes(k) && <Icon name="flag" size={13} />}
            </a>
          );
        })}
      </nav>

      <section className="section">
        <div className="section-head">
          <span className="num">{n}.{idx + 1}</span>
          <h2>{section.title}</h2>
          {section.minutes && <span className="time"><Icon name="clock" size={14} /> {section.minutes} min</span>}
        </div>
        <div className="section-flags">
          <button type="button" className={`toggle${isWeak ? " is-weak" : ""}`} aria-pressed={isWeak} title="Ajouter aux points faibles pour la révision ciblée" onClick={() => actions.toggleWeak(key)}>
            <Icon name="flag" size={16} /> Point faible
          </button>
          <button type="button" className={`toggle${isDone ? " is-done" : ""}`} aria-pressed={isDone} onClick={() => actions.toggleDone(key)}>
            <Icon name="done" size={16} /> Terminé
          </button>
        </div>
        <SectionBody section={section} keyPrefix={key} />
      </section>

      <nav className="pager">
        {prev ? (
          <a className="btn btn-ghost" href={href.lesson(lesson.id, prev.id)}><Icon name="back" /> {n}.{idx}</a>
        ) : <span />}
        <a className="btn btn-primary" href={continueHref} onClick={() => actions.toggleDone(key, true)}>
          {next ? `Terminer · ${n}.${idx + 2}` : nextLesson ? "Terminer · leçon suivante" : "Terminer"} <Icon name="next" />
        </a>
      </nav>
    </div>
  );
}
