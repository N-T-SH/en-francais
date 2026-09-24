import { lessons, lessonMinutes, revisions, sectionIndex } from "../content";
import { useStore } from "../state/store";
import { href } from "../ui/router";
import { Icon } from "../ui/icons";

export function Home() {
  const done = useStore((s) => s.done);
  const weak = useStore((s) => s.weak);
  const total = sectionIndex.size;
  const next = [...sectionIndex.values()].find((r) => !done.includes(r.key));
  const pct = total ? Math.round((done.filter((k) => sectionIndex.has(k)).length / total) * 100) : 0;

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">TEF — Test d'évaluation de français</p>
        <h1>Mes révisions</h1>
        <div className="stats">
          <div className="stat"><strong>{lessons.length}</strong><span>leçons</span></div>
          <div className="stat"><strong>{pct}%</strong><span>parcouru</span></div>
          <a className="stat stat-link" href={href.revise()}>
            <strong>{weak.filter((k) => sectionIndex.has(k)).length}</strong><span>à revoir</span>
          </a>
        </div>
        <div className="progress" aria-label={`${pct}% parcouru`}><span style={{ width: `${pct}%` }} /></div>
        {next && (
          <a className="resume" href={href.lesson(next.lesson.id, next.section.id)}>
            <span>
              <span className="resume-label">{done.length ? "Reprendre" : "Commencer"}</span>
              <span className="resume-title">{next.number} {next.section.title}</span>
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
        <ol className="lesson-list">
          {lessons.map((l, i) => {
            const keys = l.sections.map((s) => `${l.id}/${s.id}`);
            const d = keys.filter((k) => done.includes(k)).length;
            const w = keys.filter((k) => weak.includes(k)).length;
            return (
              <li key={l.id}>
                <a className="lesson-card" href={href.lesson(l.id)}>
                  <span className="lesson-num">{i + 1}</span>
                  <span className="lesson-body">
                    <span className="lesson-kicker">{l.kicker}{l.date ? ` · ${formatDate(l.date)}` : ""}</span>
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
      </section>
    </div>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
