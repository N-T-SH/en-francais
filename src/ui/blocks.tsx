import { Fragment, useState } from "react";
import type { Block, Phrase, Section } from "../content/schema";
import { alternatives, check, splitPrompt, type Verdict } from "../content/answers";
import { speak, speakAll, stop, type Source } from "../audio/speech";
import { actions, useStore } from "../state/store";
import { Icon } from "./icons";
import { sectionIndex } from "../content";

// ---------------------------------------------------------------------------
// Audio

export function SpeakChip({ phrase, active }: { phrase: Phrase; active?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const on = playing || active;
  return (
    <button
      type="button"
      className={`chip${on ? " is-playing" : ""}${failed ? " is-failed" : ""}`}
      onClick={() =>
        speak(phrase.fr, {
          onStart: (s: Source) => {
            setFailed(s === "none");
            setPlaying(s !== "none");
          },
          onEnd: () => setPlaying(false),
          onError: () => setFailed(true),
        })
      }
    >
      <span className="chip-text">
        <span className="chip-fr">{phrase.label ?? phrase.fr}</span>
        {phrase.en && <span className="chip-en">{phrase.en}</span>}
      </span>
      <span className="chip-play" aria-hidden>
        <Icon name={on ? "wave" : "play"} />
      </span>
    </button>
  );
}

export function PhrasesCard({ block }: { block: Extract<Block, { type: "phrases" }> }) {
  const [index, setIndex] = useState(-1);
  const running = index >= 0;
  return (
    <div className="card">
      <div className="card-head">
        {block.title && <h4>{block.title}</h4>}
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={() => (running ? (stop(), setIndex(-1)) : speakAll(block.items.map((p) => p.fr), setIndex))}
        >
          <Icon name={running ? "stop" : "speaker"} /> {running ? "Arrêter" : "Tout écouter"}
        </button>
      </div>
      {block.note && <p className="card-note">{block.note}</p>}
      <div className="chips">
        {block.items.map((p, i) => (
          <SpeakChip key={i} phrase={p} active={i === index} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reference

export function TableCard({ block }: { block: Extract<Block, { type: "table" }> }) {
  return (
    <div className="card">
      {block.title && <h4>{block.title}</h4>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && <p className="card-note">{block.note}</p>}
    </div>
  );
}

export function NoteCard({ block }: { block: Extract<Block, { type: "note" }> }) {
  return (
    <div className={`card note note-${block.tone}`}>
      {block.title && <h4>{block.title}</h4>}
      <p>{block.text}</p>
    </div>
  );
}

export function TaskCard({ block }: { block: Extract<Block, { type: "task" }> }) {
  const [show, setShow] = useState(false);
  return (
    <div className="card task">
      <div className="card-head">
        <h4>{block.title}</h4>
        <span className="tag">
          <Icon name={block.mode === "oral" ? "mic" : "pen"} /> {block.mode === "oral" ? "À l'oral" : "À l'écrit"}
        </span>
      </div>
      <p>{block.prompt}</p>
      {block.mode === "written" && <textarea className="scratch" rows={2} placeholder="Écrivez ici…" />}
      {block.model && (
        <>
          <button type="button" className="link" onClick={() => setShow(!show)}>
            {show ? "Masquer l'exemple" : "Voir un exemple"}
          </button>
          {show && (
            <div className="model">
              <p>{block.model}</p>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => speak(block.model!)}>
                <Icon name="speaker" /> Écouter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercises

type Answers = string[][];

export function ExerciseCard({ block, resultKey }: { block: Extract<Block, { type: "exercise" }>; resultKey: string }) {
  const empty = (): Answers => block.items.map((it) => splitPrompt(it.prompt).slice(1).map(() => ""));
  const [values, setValues] = useState<Answers>(empty);
  const [checked, setChecked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const sectionKey = resultKey.split("#")[0];
  const isWeak = useStore((s) => s.weak.includes(sectionKey));
  const canFlag = sectionIndex.has(sectionKey) && !isWeak;

  const verdicts: Verdict[][] = block.items.map((it, i) => it.answers.map((a, j) => check(values[i][j] ?? "", a)));
  const flat = verdicts.flat();
  const score = flat.filter((v) => v === "correct" || v === "accents").length;

  const set = (i: number, j: number, v: string) => {
    setValues((prev) => prev.map((row, ri) => (ri === i ? row.map((c, ci) => (ci === j ? v : c)) : row)));
    setChecked(false);
  };

  const onCheck = () => {
    setChecked(true);
    actions.recordResult(resultKey, score, flat.length);
  };

  return (
    <div className="card exercise">
      <div className="card-head">
        <h4>{block.title}</h4>
        <span className="tag"><Icon name="pen" /> Exercice</span>
      </div>
      {block.instructions && <p className="card-note">{block.instructions}</p>}
      <ol className="ex-items">
        {block.items.map((it, i) => {
          const parts = splitPrompt(it.prompt);
          return (
            <li key={i}>
              <div className="ex-line">
                {parts.map((text, j) => (
                  <Fragment key={j}>
                    <span>{text}</span>
                    {j < parts.length - 1 && (
                      <Blank
                        value={values[i][j]}
                        answer={it.answers[j]}
                        verdict={checked ? verdicts[i][j] : undefined}
                        choices={it.choices}
                        onChange={(v) => set(i, j, v)}
                        label={`Réponse ${i + 1}${parts.length > 2 ? `.${j + 1}` : ""}`}
                      />
                    )}
                  </Fragment>
                ))}
                {it.hint && <span className="hint">({it.hint})</span>}
              </div>
              {it.choices && (
                <div className="choices" role="group">
                  {it.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`choice${values[i].includes(c) ? " is-picked" : ""}`}
                      onClick={() => set(i, nextBlankForChoice(values[i]), c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {checked && verdicts[i].some((v) => v === "wrong" || v === "empty") && (
                <div className="correction">→ {it.answers.map((a) => alternatives(a)[0]).join(" · ")}</div>
              )}
              {checked && verdicts[i].includes("accents") && <div className="correction soft">Attention aux accents.</div>}
            </li>
          );
        })}
      </ol>
      <div className="ex-actions">
        <button type="button" className="btn btn-primary" onClick={onCheck}>
          <Icon name="check" /> Vérifier
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setReveal(!reveal)}>
          {reveal ? "Masquer les réponses" : "Voir les réponses"}
        </button>
        {checked && (
          <button type="button" className="btn btn-ghost" onClick={() => { setValues(empty()); setChecked(false); }}>
            <Icon name="redo" /> Recommencer
          </button>
        )}
      </div>
      {checked && (
        <div className={`score ${score === flat.length ? "score-full" : score / flat.length >= 0.7 ? "score-ok" : "score-low"}`}>
          <strong>{score} / {flat.length}</strong>
          {score === flat.length ? " — Parfait !" : score / flat.length >= 0.7 ? " — Bien joué." : " — À revoir."}
          {score / flat.length < 0.7 && canFlag && (
            <button type="button" className="link" onClick={() => actions.toggleWeak(sectionKey, true)}>
              Ajouter aux points faibles
            </button>
          )}
        </div>
      )}
      {reveal && (
        <div className="answers">
          {block.items.map((it, i) => (
            <p key={i}>
              {i + 1}. {it.answers.map((a) => alternatives(a).join(" / ")).join(" · ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function nextBlank(row: string[]): number {
  const i = row.findIndex((v) => !v);
  return i === -1 ? row.length - 1 : i;
}

function nextBlankForChoice(row: string[]): number {
  // Single-blank items: tapping a choice replaces the answer.
  return row.length === 1 ? 0 : nextBlank(row);
}

function Blank(props: {
  value: string;
  answer: string;
  verdict?: Verdict;
  choices?: string[];
  onChange: (v: string) => void;
  label: string;
}) {
  const width = Math.max(4, ...alternatives(props.answer).map((a) => a.length)) + 3;
  const cls = `blank${props.verdict ? ` is-${props.verdict}` : ""}`;
  if (props.choices)
    return (
      <button type="button" className={`${cls} blank-pick`} style={{ minWidth: `${width}ch` }} aria-label={props.label} onClick={() => props.onChange("")}>
        {props.value || " "}
      </button>
    );
  return (
    <input
      className={cls}
      style={{ width: `${width}ch` }}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      aria-label={props.label}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      lang="fr"
    />
  );
}

// ---------------------------------------------------------------------------

export function BlockView({ block, resultKey }: { block: Block; resultKey: string }) {
  switch (block.type) {
    case "phrases":
      return <PhrasesCard block={block} />;
    case "table":
      return <TableCard block={block} />;
    case "exercise":
      return <ExerciseCard block={block} resultKey={resultKey} />;
    case "task":
      return <TaskCard block={block} />;
    case "note":
      return <NoteCard block={block} />;
  }
}

export function SectionBody({ section, keyPrefix }: { section: Section; keyPrefix: string }) {
  return (
    <>
      {section.lede && <p className="lede">{section.lede}</p>}
      {section.blocks.map((b, i) => (
        <BlockView key={`${keyPrefix}#${i}`} block={b} resultKey={`${keyPrefix}#${i}`} />
      ))}
    </>
  );
}
