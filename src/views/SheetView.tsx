import { revisions, sectionIndex } from "../content";
import { SectionBody } from "../ui/blocks";
import { href } from "../ui/router";
import { Icon } from "../ui/icons";
import { formatDate } from "./Home";
import { NotFound } from "./NotFound";

export function SheetView({ id }: { id: string }) {
  const sheet = revisions.find((r) => r.id === id);
  if (!sheet) return <NotFound />;
  return (
    <div className="page">
      <a className="back" href={href.revise()}><Icon name="back" /> Révision</a>
      <header className="lesson-head">
        <p className="kicker"><Icon name="sparkle" size={14} /> Fiche de révision · {formatDate(sheet.created)}</p>
        <h1>{sheet.title}</h1>
        {sheet.intro && <p className="lesson-summary">{sheet.intro}</p>}
        <div className="covers">
          {sheet.covers.map((k) => {
            const r = sectionIndex.get(k);
            return r ? (
              <a key={k} className="pill" href={href.lesson(r.lesson.id, r.section.id)}>{r.number} {r.section.title}</a>
            ) : null;
          })}
        </div>
      </header>
      {sheet.sections.map((s, i) => (
        <section className="section" key={s.id}>
          <div className="section-head">
            <span className="num">{i + 1}</span>
            <h2>{s.title}</h2>
            {s.minutes && <span className="time"><Icon name="clock" size={14} /> {s.minutes} min</span>}
          </div>
          <SectionBody section={s} keyPrefix={`revision:${sheet.id}/${s.id}`} />
        </section>
      ))}
    </div>
  );
}
