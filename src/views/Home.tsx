import { useState } from "react";
import { LEVEL_INFO, lessons, lessonMinutes, lessonNumber, levels, revisions, sectionIndex, unitGroups } from "../content";
import type { Level } from "../content/schema";
import { useStore } from "../state/store";
import { href } from "../ui/router";
import { Icon } from "../ui/icons";

const LEVEL_KEY = "en-francais:level";

function savedLevel(): Level | null {
  try {
    const v = localStorage.getItem(LEVEL_KEY);
    return levels.find((l) => l === v) ?? null;
  } catch {
    return null;
  }
}

export function Home() {
  const done = useStore((s) => s.done);
  const weak = useStore((s) => s.weak);
  const firstTodo = [...sectionIndex.values()].find((r) => !done.includes(r.key));
  const [level, setLevelState] = useState<Level>(() => savedLevel() ?? firstTodo?.lesson.level ?? levels[0]);
  const setLevel = (l: Level) => {
    setLevelState(l);
    try {
      localStorage.setItem(LEVEL_KEY, l);
    } catch {
      /* storage unavailable: the choice just isn't remembered */
    }
  };

  const inLevel = [...sectionIndex.values()].filter((r) => r.lesson.level === level);
  const total = inLevel.length;
  const doneCount = inLevel.filter((r) => done.includes(r.key)).length;
  const weakCount = inLevel.filter((r) => weak.includes(r.key)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const levelLessons = lessons.filter((l) => l.level === level);
  const next = inLevel.find((r) => !done.includes(r.key));

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">TEF — Test d'évaluation de français</p>
        <h1>Mes révisions</h1>
        {levels.length > 1 && (
          <div className="segmented level-tabs" role="tablist" aria-label="Niveau">
            {levels.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={l === level} className={l === level ? "is-on" : ""} onClick={() => setLevel(l)}>
                {l}<small>{LEVEL_INFO[l].book}</small>
              </button>
            ))}
          </div>
        )}
        <p className="level-name">{LEVEL_INFO[level].name} · manuel <em>{LEVEL_INFO[level].book}</em></p>
        <div className="stats">
          <div className="stat"><strong>{levelLessons.length}</strong><span>leçons</span></div>
          <div className="stat"><strong>{pct}%</strong><span>parcouru</span></div>
          <a className="stat stat-link" href={href.revise()}>
            <strong>{weakCount}</strong><span>à revoir</span>
          </a>
        </div>
        <div className="progress" aria-label={`${pct}% parcouru`}><span style={{ width: `${pct}%` }} /></div>
        {next && (
          <a className="resume" href={href.lesson(next.lesson.id, next.section.id)}>
            <span>
              <span className="resume-label">{done.length ? "Reprendre" : "Commencer"}</span>
              <span className="resume-title">{next.label} {next.section.title}</span>
              <span className="resume-sub">{next.lesson.title}</span>
            </span>
            <Icon name="next" size={22} />
          </a>
        )}
      </header>

      {revisions.length > 0 && (
        <section className="shelf">
          <h2 className="shelf-title"><Icon name="sparkle" /> Fiches de révision</h2>
          <div className="sheet-list">
            {revisions.slice(0, 3).map((r) => (
              <a key={r.id} className="sheet-card" href={href.sheet(r.id)}>
                <span className="sheet-date">{formatDate(r.created)}</span>
                <span className="sheet-title">{r.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="shelf">
        <h2 className="shelf-title"><Icon name="book" /> Leçons</h2>
        {unitGroups(level).map((g) => {
          const unitKeys = g.lessons.flatMap((l) => l.sections.map((s) => `${l.id}/${s.id}`));
          const unitDone = unitKeys.filter((k) => done.includes(k)).length;
          return (
          <div className="unit" key={`${g.level}-${g.unit ?? "other"}`}>
            <h3 className="unit-title">
              <span className="unit-num">{g.unit !== null ? `Unité ${g.unit}` : "Bonus"}</span>
              {g.title && <span className="unit-name">{g.title}</span>}
              <span className="unit-count">{unitDone}/{unitKeys.length}</span>
            </h3>
            <ol className="lesson-list">
              {g.lessons.map((l) => {
                const keys = l.sections.map((s) => `${l.id}/${s.id}`);
                const d = keys.filter((k) => done.includes(k)).length;
                const w = keys.filter((k) => weak.includes(k)).length;
                return (
                  <li key={l.id}>
                    <a className="lesson-card" href={href.lesson(l.id)}>
                      <span className="lesson-num">{lessonNumber(l)}</span>
                      <span className="lesson-body">
                        <span className="lesson-kicker">{l.level} · {l.kicker}{l.date ? ` · ${formatDate(l.date)}` : ""}</span>
                        <span className="lesson-title">{l.title}</span>
                        <span className="lesson-summary">{l.summary}</span>
                        <span className="lesson-meta">
                          <span><Icon name="clock" size={14} /> ~{lessonMinutes(l.sections)} min</span>
                          <span>{d}/{keys.length} sections</span>
                          {w > 0 && <span className="weak-pill"><Icon name="flag" size={13} /> {w}</span>}
                        </span>
                        <span className="progress thin"><span style={{ width: `${(d / keys.length) * 100}%` }} /></span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
          );
        })}
      </section>
    </div>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
