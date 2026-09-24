import { useState } from "react";
import { revisions, sectionIndex, type SectionRef } from "../content";
import type { Block } from "../content/schema";
import { speakAll, stop } from "../audio/speech";
import { actions, useStore, type State } from "../state/store";
import { ExerciseCard, SpeakChip } from "../ui/blocks";
import { href } from "../ui/router";
import { Icon } from "../ui/icons";
import { formatDate } from "./Home";

/** Weak sections, in course order. */
function useWeakRefs(): SectionRef[] {
  const weak = useStore((s) => s.weak);
  return [...sectionIndex.values()].filter((r) => weak.includes(r.key));
}

/** Average exercise score per section, from the latest attempts. */
function sectionScore(results: State["results"], key: string): number | null {
  const rs = Object.entries(results).filter(([k]) => k.startsWith(`${key}#`)).map(([, r]) => r);
  if (!rs.length) return null;
  const c = rs.reduce((n, r) => n + r.correct, 0);
  const t = rs.reduce((n, r) => n + r.total, 0);
  return t ? c / t : null;
}

export function Revise() {
  const refs = useWeakRefs();
  const results = useStore((s) => s.results);
  const [copied, setCopied] = useState(false);
  const suggestions = [...sectionIndex.values()].filter((r) => {
    const s = sectionScore(results, r.key);
    return s !== null && s < 0.7 && !refs.includes(r);
  });

  const request = [
    "Crée une fiche de révision (content/revisions) pour mes points faibles :",
    ...refs.map((r) => {
      const s = sectionScore(results, r.key);
      return `- ${r.key} — ${r.number} ${r.section.title}${s !== null ? ` (score ${Math.round(s * 100)} %)` : ""}`;
    }),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(request);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copiez ce texte :", request);
    }
  };

  return (
    <div className="page">
      <header className="hero compact">
        <p className="kicker">Révision ciblée</p>
        <h1>Mes points faibles</h1>
        <p className="hero-note">
          Marquez une section avec <Icon name="flag" size={14} /> pendant une leçon, ou après un exercice raté.
          Elle apparaît ici pour un quiz et une écoute ciblés.
        </p>
      </header>

      {refs.length === 0 ? (
        <div className="card empty-card">
          <p>Aucun point faible pour l'instant.</p>
          <p className="card-note">Ouvrez une leçon et appuyez sur « Marquer comme point faible » sur les sections difficiles.</p>
        </div>
      ) : (
        <>
          <div className="practice-grid">
            <a className="practice-card" href={href.quiz()}>
              <Icon name="shuffle" size={26} />
              <strong>Quiz ciblé</strong>
              <span>Tous les exercices de vos points faibles, mélangés.</span>
            </a>
            <a className="practice-card" href={href.listen()}>
              <Icon name="headphones" size={26} />
              <strong>Écoute ciblée</strong>
              <span>Toutes les phrases à écouter et répéter.</span>
            </a>
          </div>

          <ul className="weak-list">
            {refs.map((r) => {
              const s = sectionScore(results, r.key);
              return (
                <li key={r.key}>
                  <a href={href.lesson(r.lesson.id, r.section.id)}>
                    <span className="num">{r.number}</span>
                    <span className="weak-body">
                      <span className="weak-title">{r.section.title}</span>
                      <span className="weak-sub">{r.lesson.title}{s !== null ? ` · dernier score ${Math.round(s * 100)} %` : ""}</span>
                    </span>
                  </a>
                  <button type="button" className="icon-btn" aria-label="Retirer" title="Retirer des points faibles" onClick={() => actions.toggleWeak(r.key, false)}>×</button>
                </li>
              );
            })}
          </ul>

          <div className="card ask-card">
            <h4><Icon name="sparkle" /> Fiche de synthèse personnalisée</h4>
            <p className="card-note">
              Copiez cette demande et collez-la dans votre session Claude : une fiche de révision
              (résumé, nouveaux exemples audio, exercices inédits) sera ajoutée à l'application.
            </p>
            <pre className="request">{request}</pre>
            <button type="button" className="btn btn-primary" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} /> {copied ? "Copié !" : "Copier la demande"}
            </button>
          </div>
        </>
      )}

      {suggestions.length > 0 && (
        <section className="shelf">
          <h2 className="shelf-title">Suggestions</h2>
          <p className="card-note">Scores sous 70 % aux derniers exercices :</p>
          <ul className="weak-list">
            {suggestions.map((r) => (
              <li key={r.key}>
                <a href={href.lesson(r.lesson.id, r.section.id)}>
                  <span className="num">{r.number}</span>
                  <span className="weak-body"><span className="weak-title">{r.section.title}</span></span>
                </a>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.toggleWeak(r.key, true)}>
                  <Icon name="flag" size={14} /> Ajouter
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="shelf">
        <h2 className="shelf-title"><Icon name="sparkle" /> Fiches de révision</h2>
        {revisions.length === 0 ? (
          <p className="card-note">Aucune fiche pour l'instant.</p>
        ) : (
          <div className="sheet-list">
            {revisions.map((r) => (
              <a key={r.id} className="sheet-card" href={href.sheet(r.id)}>
                <span className="sheet-date">{formatDate(r.created)}</span>
                <span className="sheet-title">{r.title}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Practice({ mode }: { mode: "quiz" | "listen" }) {
  const refs = useWeakRefs();
  const pool = refs.length ? refs : [...sectionIndex.values()];
  const [seed, setSeed] = useState(0);

  return (
    <div className="page">
      <a className="back" href={href.revise()}><Icon name="back" /> Points faibles</a>
      <header className="hero compact">
        <p className="kicker">{refs.length ? `${refs.length} point(s) faible(s)` : "Toutes les leçons"}</p>
        <h1>{mode === "quiz" ? "Quiz ciblé" : "Écoute ciblée"}</h1>
      </header>
      {mode === "quiz" ? <Quiz key={seed} pool={pool} onReshuffle={() => setSeed(seed + 1)} /> : <Listen pool={pool} />}
    </div>
  );
}

function Quiz({ pool, onReshuffle }: { pool: SectionRef[]; onReshuffle: () => void }) {
  const [items] = useState(() =>
    shuffle(
      pool.flatMap((r) =>
        r.section.blocks
          .map((b, i) => ({ b, i }))
          .filter((x): x is { b: Extract<Block, { type: "exercise" }>; i: number } => x.b.type === "exercise")
          .map(({ b, i }) => ({ ref: r, block: b, key: `${r.key}#${i}` })),
      ),
    ),
  );
  if (!items.length) return <p className="card-note">Pas d'exercice dans ces sections — essayez l'écoute ciblée.</p>;
  return (
    <>
      {items.map(({ ref, block, key }) => (
        <div key={key}>
          <p className="from">{ref.number} · {ref.section.title}</p>
          <ExerciseCard block={block} resultKey={key} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={onReshuffle}><Icon name="shuffle" /> Mélanger à nouveau</button>
    </>
  );
}

function Listen({ pool }: { pool: SectionRef[] }) {
  const phrases = pool.flatMap((r) => r.section.blocks.flatMap((b) => (b.type === "phrases" ? b.items : [])));
  const [index, setIndex] = useState(-1);
  const running = index >= 0;
  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => (running ? (stop(), setIndex(-1)) : speakAll(phrases.map((p) => p.fr), setIndex))}
      >
        <Icon name={running ? "stop" : "headphones"} /> {running ? "Arrêter" : `Tout écouter (${phrases.length})`}
      </button>
      {pool.map((r) => {
        const items = r.section.blocks.flatMap((b) => (b.type === "phrases" ? b.items : []));
        if (!items.length) return null;
        const offset = phrases.indexOf(items[0]);
        return (
          <div className="card" key={r.key}>
            <h4>{r.number} · {r.section.title}</h4>
            <div className="chips">
              {items.map((p, i) => <SpeakChip key={i} phrase={p} active={offset + i === index} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}
