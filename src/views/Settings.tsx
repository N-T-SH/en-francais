import { useEffect, useRef, useState } from "react";
import { frenchVoices, hasDeviceSpeech, loadManifest, speak, type AudioManifest, type Source } from "../audio/speech";
import { actions, useStore } from "../state/store";
import { Icon } from "../ui/icons";

const SAMPLE = "Bonjour ! Je m'appelle Camille. J'habite à Paris et j'ai vingt-huit ans.";

export function Settings() {
  const settings = useStore((s) => s.settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(frenchVoices);
  const [manifest, setManifest] = useState<AudioManifest | null | undefined>(undefined);
  const [status, setStatus] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadManifest().then(setManifest);
    if (!hasDeviceSpeech()) return;
    const update = () => setVoices(frenchVoices());
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const neuralCount = manifest ? Object.keys(manifest.files).length : 0;

  const test = () => {
    setStatus("Lecture…");
    void speak(SAMPLE, {
      onStart: (s: Source) =>
        setStatus(s === "neural" ? `Voix neuronale : ${manifest?.voice}` : s === "device" ? "Voix de l'appareil" : "Aucune voix disponible"),
      onError: (e) => setStatus(`Erreur : ${e}`),
    });
  };

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `en-francais-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      actions.importJson(await file.text());
      setImportMsg("✓ Progression importée.");
    } catch {
      setImportMsg("✕ Fichier invalide.");
    }
  };

  return (
    <div className="page">
      <header className="hero compact">
        <p className="kicker">Réglages</p>
        <h1>Voix & données</h1>
      </header>

      <div className="card">
        <h4><Icon name="speaker" /> Voix</h4>
        <p className="card-note">
          {manifest === undefined
            ? "Recherche des enregistrements…"
            : neuralCount
              ? `${neuralCount} phrases enregistrées avec une voix neuronale (${manifest!.voice}). Les autres utilisent la voix de l'appareil.`
              : "Pas d'enregistrements neuronaux dans cette version : la voix de l'appareil est utilisée."}
        </p>
        <fieldset className="radio-group">
          <label>
            <input type="radio" name="src" checked={settings.voiceSource === "auto"} onChange={() => actions.updateSettings({ voiceSource: "auto" })} />
            <span><strong>Voix naturelle</strong> <small>enregistrements neuronaux, voix de l'appareil en secours</small></span>
          </label>
          <label>
            <input type="radio" name="src" checked={settings.voiceSource === "device"} onChange={() => actions.updateSettings({ voiceSource: "device" })} />
            <span><strong>Voix de l'appareil</strong> <small>synthèse vocale du navigateur</small></span>
          </label>
        </fieldset>

        <label className="field">
          <span>Voix de l'appareil</span>
          <select
            value={settings.deviceVoice ?? ""}
            onChange={(e) => actions.updateSettings({ deviceVoice: e.target.value || null })}
            disabled={!voices.length}
          >
            <option value="">Automatique (la plus naturelle)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
            ))}
          </select>
          {!voices.length && <small>Aucune voix française trouvée sur cet appareil.</small>}
        </label>

        <label className="field">
          <span>Vitesse : {settings.rate.toFixed(2)}×</span>
          <input type="range" min={0.6} max={1.2} step={0.05} value={settings.rate} onChange={(e) => actions.updateSettings({ rate: Number(e.target.value) })} />
        </label>

        <button type="button" className="btn btn-primary" onClick={test}><Icon name="play" /> Tester</button>
        {status && <p className="card-note status">{status}</p>}
      </div>

      <div className="card">
        <h4>Thème</h4>
        <div className="segmented" role="group">
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} type="button" className={settings.theme === t ? "is-on" : ""} onClick={() => actions.updateSettings({ theme: t })}>
              {t === "system" ? "Auto" : t === "light" ? "Clair" : "Sombre"}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h4>Progression</h4>
        <p className="card-note">
          Vos points faibles et scores sont gardés sur cet appareil. Exportez-les pour les retrouver
          sur un autre appareil (téléphone ↔ ordinateur).
        </p>
        <div className="row">
          <button type="button" className="btn btn-soft" onClick={download}>Exporter</button>
          <button type="button" className="btn btn-soft" onClick={() => fileRef.current?.click()}>Importer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button
            type="button"
            className="btn btn-ghost danger"
            onClick={() => confirm("Effacer toute la progression sur cet appareil ?") && actions.reset()}
          >
            Réinitialiser
          </button>
        </div>
        {importMsg && <p className="card-note status">{importMsg}</p>}
      </div>

      <p className="footnote">Version {__APP_VERSION__}</p>
    </div>
  );
}
